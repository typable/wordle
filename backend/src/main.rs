use std::fmt;
use std::fs;
use std::io;
use std::time::SystemTime;

use log::info;
use log::warn;
use rand::Rng;

use serde::Deserialize;
use serde::Serialize;

use tide::sessions::MemoryStore;
use tide::sessions::SessionMiddleware;
use tide::StatusCode;

use sqlx::Postgres;

use tide_sqlx::SQLxMiddleware;

extern crate log;

const DATABASE_URL: &str = "postgres://andreas:De24Si98@192.168.2.2/verbal";
const SESSION_SECRET: &str = "012345689012345678901234568901234567890123456890123456789";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Word([Option<char>; 5]);

impl Word {
    pub fn is_valid(&self) -> bool {
        !self.0.iter().any(|char| char.is_none())
    }
}

impl PartialEq for Word {
    fn eq(&self, other: &Self) -> bool {
        for (i, char) in self.0.iter().enumerate() {
            if !char.eq(&other.0[i]) {
                return false;
            }
        }
        true
    }
}

impl From<String> for Word {
    fn from(string: String) -> Self {
        let mut word = [None; 5];
        let mut chars = string.chars();
        let mut i = 0;
        while i < word.len() {
            word[i] = chars.next();
            i += 1;
        }
        Self(word)
    }
}

#[derive(Debug, Clone)]
pub struct State {
    pub words: Vec<Word>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub mode: Mode,
    pub word: Word,
    pub score: i32,
    pub guesses: Vec<Guess>,
}

impl Game {
    pub fn new(mode: Mode, word: Word) -> Self {
        Self {
            mode,
            word,
            score: 0,
            guesses: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Mode {
    Daily,
    Training,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Indicator {
    Correct,
    Included,
    Wrong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Action {
    InternalServerError {
        error: String,
    },
    BadRequest {
        error: String,
    },
    GameStarted,
    GameEnded {
        has_won: bool,
        score: i32,
        indicators: [Option<Indicator>; 5],
    },
    WordNotIncluded,
    WordResult {
        indicators: [Option<Indicator>; 5],
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Guess {
    pub word: Word,
    pub indicators: [Option<Indicator>; 5],
}

impl Guess {
    pub fn new(word: Word) -> Self {
        Self {
            word,
            indicators: [None; 5],
        }
    }

    pub fn evaluate(&mut self, word: Word) {
        for (i, char) in self.word.0.iter().enumerate() {
            self.indicators[i] = if char.eq(&word.0[i]) {
                Some(Indicator::Correct)
            } else if word.0.contains(char) {
                Some(Indicator::Included)
            } else {
                Some(Indicator::Wrong)
            }
        }
    }

    pub fn is_match(&self) -> bool {
        for indicator in self.indicators {
            if indicator.is_none() {
                return false;
            }
            if let Some(indicator) = indicator {
                if !Indicator::Correct.eq(&indicator) {
                    return false;
                }
            }
        }
        true
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Reply<T: Serialize> {
    ok: bool,
    value: Option<T>,
    error: Option<String>,
}

impl Reply<()> {
    pub fn ok() -> tide::Result {
        Self {
            ok: true,
            value: None,
            error: None,
        }
        .into()
    }

    pub fn with_error(error: impl fmt::Display) -> tide::Result {
        Self {
            ok: false,
            value: None,
            error: Some(error.to_string()),
        }
        .into()
    }
}

impl<T: Serialize> Reply<T> {
    pub fn with(value: T) -> tide::Result {
        Self {
            ok: true,
            value: Some(value),
            error: None,
        }
        .into()
    }
}

impl<T: Serialize> From<Reply<T>> for tide::Result {
    fn from(reply: Reply<T>) -> Self {
        Ok(tide::Body::from_json(&reply)?.into())
    }
}

#[tokio::main]
async fn main() {
    env_logger::init();
    if let Err(err) = run().await {
        println!("{}", err);
    }
}

async fn run() -> io::Result<()> {
    let content = fs::read_to_string("./words.txt")?;
    let words = content
        .lines()
        .map(|str| {
            let word: Word = str.to_string().into();
            if !word.is_valid() {
                warn!("Invalid word '{}'!", str);
            }
            word
        })
        .collect::<Vec<Word>>();
    let state = State { words };
    let mut app = tide::with_state(state);

    app.with(SQLxMiddleware::<Postgres>::new(DATABASE_URL).await.unwrap());
    app.with(SessionMiddleware::new(
        MemoryStore::new(),
        SESSION_SECRET.as_bytes(),
    ));

    app.at("*").options(done);
    app.at("/").serve_file("../www/index.html")?;
    app.at("/*").serve_file("../www/index.html")?;
    app.at("/assets").serve_dir("../www/dist")?;
    app.at("/api/:mode/start").post(start_game);
    app.at("/api/guess").post(eval_guess);

    info!("Starting on 0.0.0.0:4208");
    app.listen("0.0.0.0:4208").await?;
    Ok(())
}

async fn done(_: tide::Request<State>) -> tide::Result {
    Ok(tide::Response::new(StatusCode::Ok))
}

async fn start_game(mut req: tide::Request<State>) -> tide::Result {
    let mode = match req.param("mode")? {
        "daily" => Mode::Daily,
        "training" => Mode::Training,
        _ => {
            return Reply::with(Action::BadRequest {
                error: "Invalid game mode!".to_string(),
            });
        }
    };
    if req.session().get::<Game>("game").is_some() {
        return Reply::with(Action::BadRequest {
            error: "Already ingame!".to_string(),
        });
    }
    let word = determine_word(&mode, req.state());
    let game = Game::new(mode, word);
    req.session_mut().insert("game", game)?;
    Reply::with(Action::GameStarted)
}

async fn eval_guess(mut req: tide::Request<State>) -> tide::Result {
    if let Some(mut game) = req.session().get::<Game>("game") {
        let word = req.body_json::<String>().await?.to_lowercase().into();
        let state = req.state();
        if !state.words.contains(&word) {
            return Reply::with(Action::WordNotIncluded);
        }
        let mut guess = Guess::new(word);
        guess.evaluate(game.word.clone());
        game.guesses.push(guess.clone());
        if guess.is_match() {
            req.session_mut().remove("game");
            Reply::with(Action::GameEnded {
                has_won: true,
                score: game.score,
                indicators: guess.indicators,
            })
        } else {
            req.session_mut().insert("game", game.clone())?;
            if game.guesses.len() == 6 {
                req.session_mut().remove("game");
                Reply::with(Action::GameEnded {
                    has_won: false,
                    score: game.score,
                    indicators: guess.indicators,
                })
            } else {
                Reply::with(Action::WordResult {
                    indicators: guess.indicators,
                })
            }
        }
    } else {
        Reply::with(Action::BadRequest {
            error: "Not ingame!".to_string(),
        })
    }
}

fn determine_word(mode: &Mode, state: &State) -> Word {
    match mode {
        Mode::Daily => {
            let now = SystemTime::now();
            let duration = now.duration_since(SystemTime::UNIX_EPOCH).unwrap();
            let days = (duration.as_secs() / 60 / 60 / 24) as usize;
            let index = days % state.words.len();
            state.words[index].clone()
        }
        Mode::Training => {
            let mut rng = rand::thread_rng();
            let index = rng.gen_range(0..state.words.len());
            state.words[index].clone()
        }
    }
}

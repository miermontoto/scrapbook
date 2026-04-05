use parking_lot::Mutex;
use std::collections::HashMap;

use crate::pty::instance::PtyInstance;

pub struct AppState {
    pub ptys: Mutex<HashMap<String, PtyInstance>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            ptys: Mutex::new(HashMap::new()),
        }
    }
}

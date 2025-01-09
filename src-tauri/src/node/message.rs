use p2panda_core::Hash;
use serde::{Deserialize, Serialize};

pub type CalendarId = Hash;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum MessageType {
    Application,
}

use p2panda_core::Hash;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum MessageType {
    Application,
}

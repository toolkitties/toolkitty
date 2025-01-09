use std::collections::HashMap;
use std::hash::Hash as StdHash;

use async_trait::async_trait;
use p2panda_core::{Hash, PublicKey};
use p2panda_net::TopicId;
use p2panda_sync::log_sync::TopicLogMap;
use p2panda_sync::TopicQuery;
use serde::{Deserialize, Serialize};

use crate::node::operation::LogId;

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(tag = "t", content = "c", rename_all = "snake_case")]
pub enum NetworkTopic {
    InviteCodes,
    Calendar { calendar_id: Hash },
}

impl TopicQuery for NetworkTopic {}

impl TopicId for NetworkTopic {
    fn id(&self) -> [u8; 32] {
        match self {
            NetworkTopic::InviteCodes => Hash::new(b"invite-codes").into(),
            NetworkTopic::Calendar { calendar_id } => {
                Hash::new(format!("data-{calendar_id}").as_bytes()).into()
            }
        }
    }
}

#[derive(Debug)]
pub struct TopicMap {}

impl TopicMap {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl TopicLogMap<NetworkTopic, LogId> for TopicMap {
    async fn get(&self, topic: &NetworkTopic) -> Option<HashMap<PublicKey, Vec<LogId>>> {
        match topic {
            // We don't want to sync over invite codes.
            NetworkTopic::InviteCodes => None,
            NetworkTopic::Calendar { calendar_id } => todo!(),
        }
    }
}

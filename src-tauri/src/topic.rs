use std::{collections::HashMap, fmt::Display};
use std::hash::Hash as StdHash;
use std::sync::Arc;

use async_trait::async_trait;
use p2panda_core::{Hash, PublicKey};
use p2panda_net::TopicId;
use p2panda_sync::log_sync::TopicLogMap;
use p2panda_sync::TopicQuery;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::node::operation::{CalendarId, LogId, LogType};

const INVITE_CODES_TOPIC_ID: &str = "invite-codes";
const DATA_TOPIC_ID_PREFIX: &str = "data";
const INBOX_TOPIC_ID_PREFIX: &str = "inbox";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TopicType {
    Inbox,
    Data,
}

impl Display for TopicType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let topic_type = match self {
            TopicType::Inbox => "inbox",
            TopicType::Data => "data",
        };
        write!(f, "{topic_type}")
    }
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(tag = "t", content = "c", rename_all = "snake_case")]
pub enum NetworkTopic {
    InviteCodes,
    CalendarInbox { calendar_id: CalendarId },
    CalendarData { calendar_id: CalendarId },
}

impl TopicQuery for NetworkTopic {}

impl TopicId for NetworkTopic {
    fn id(&self) -> [u8; 32] {
        match self {
            NetworkTopic::InviteCodes => Hash::new(INVITE_CODES_TOPIC_ID.as_bytes()).into(),
            NetworkTopic::CalendarInbox { calendar_id } => {
                Hash::new(format!("{INBOX_TOPIC_ID_PREFIX}-{calendar_id}").as_bytes()).into()
            }
            NetworkTopic::CalendarData { calendar_id } => {
                Hash::new(format!("{DATA_TOPIC_ID_PREFIX}-{calendar_id}").as_bytes()).into()
            }
        }
    }
}

#[derive(Clone, Debug)]
pub struct TopicMap {
    inner: Arc<RwLock<InnerTopicMap>>,
}

#[derive(Clone, Debug)]
struct InnerTopicMap {
    authors: HashMap<NetworkTopic, Vec<PublicKey>>,
}

impl TopicMap {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(InnerTopicMap {
                authors: HashMap::new(),
            })),
        }
    }

    pub async fn add_author(&self, public_key: PublicKey, topic: NetworkTopic) {
        let mut lock = self.inner.write().await;
        lock.authors
            .entry(topic)
            .and_modify(|public_keys| public_keys.push(public_key))
            .or_insert(vec![public_key]);
    }
}

#[async_trait]
impl TopicLogMap<NetworkTopic, LogId> for TopicMap {
    async fn get(&self, topic: &NetworkTopic) -> Option<HashMap<PublicKey, Vec<LogId>>> {
        let log_id = match topic {
            NetworkTopic::InviteCodes => return None,
            NetworkTopic::CalendarInbox { calendar_id } => LogId {
                calendar_id: *calendar_id,
                log_type: LogType::Inbox,
            },
            NetworkTopic::CalendarData { calendar_id } => LogId {
                calendar_id: *calendar_id,
                log_type: LogType::Data,
            },
        };

        let inner = self.inner.read().await;
        inner.authors.get(&topic).map(|public_keys| {
            let mut result = HashMap::with_capacity(public_keys.len());
            for public_key in public_keys {
                result.insert(
                    public_key.to_owned(),
                    // @TODO(adz): Currently we store all operations in one log per topic,
                    // later we want to list all possible "log types" here, for example for
                    // all events, resources, messages etc.
                    vec![log_id.clone()],
                );
            }
            result
        })
    }
}

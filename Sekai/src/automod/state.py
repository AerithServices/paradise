RULE_INVITES = "bore: Invites"
RULE_LINKS = "bore: Links"
RULE_MENTIONSPAM = "bore: Mention spam"
RULE_SPAM = "bore: Spam"
RULE_WALLOFTEXT = "bore: Wall of text"
RULE_EMOJISPAM = "bore: Emoji spam"

FEATURES = ("emojispam", "mentionspam", "spam", "walloftext", "invites", "links")

FEATURE_RULE_NAMES = {
    "invites": RULE_INVITES,
    "links": RULE_LINKS,
    "mentionspam": RULE_MENTIONSPAM,
    "spam": RULE_SPAM,
    "walloftext": RULE_WALLOFTEXT,
    "emojispam": RULE_EMOJISPAM,
}

NAME_TO_FEATURE = {v: k for k, v in FEATURE_RULE_NAMES.items()}

DEFAULT_MENTION_LIMIT = 5

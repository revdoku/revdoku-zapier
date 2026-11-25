const { version } = require("./package.json");
const definitions = (modules) =>
  Object.fromEntries(modules.map((definition) => [definition.key, definition]));
// `limits` documents a step's bounds for the tests; Zapier's schema has no such key.
const step = ({ limits: _limits, ...definition }) => definition;

module.exports = {
  version,
  platformVersion: require("zapier-platform-core").version,
  authentication: require("./authentication"),
  flags: { cleanInputData: false },
  triggers: definitions([
    step(require("./triggers/new_support_request")),
    require("./triggers/projects"),
  ]),
  searches: definitions([step(require("./searches/find_ticket"))]),
  creates: definitions([
    require("./creates/reply_to_ticket"),
    require("./creates/set_ticket_status"),
  ]),
};

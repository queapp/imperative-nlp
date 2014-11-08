actions = module.exports.actions = {
  list: "actions.list",
  add: "actions.add",
  subtract: "actions.subtract"
};

words = module.exports.words = [
  {
    aliases: ["be", "was", "is", "been", "are"],
    action: actions.list,
    speach: 'v'
  }
];

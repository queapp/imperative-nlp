// natural language processor

var _ = require("underscore");
var async = require("async");

var natural = require("natural");
var wordnet = new natural.WordNet();

var worddata = require("./data/words");

// this code below finds synonyms for the words specified.
module.exports = function(raw, opts, callback) {
  // set options if none
  opts = opts || {};

  // tolkenize the sentence
  tokenizer = new natural.WordTokenizer();
  words = tokenizer.tokenize( raw );

  // variables
  out = [];
  actions = [];

  // async function to lookup words
  lookupWord = function(word, callback) {



    // define the word
    wordnet.lookup(word, function(results) {

      // get the word's stem
      stem = natural.PorterStemmer.stem(word);

      // create the data structure
      d = {
        word: stem,
        synonyms: [],
        speach: null,
        means: null
      }

      pos = [];

      if (results.length) {

        // loop through each result
        _.each(results, function(result) {
          d.synonyms = _.union(d.synonyms, result.synonyms);
          pos.push(result.pos);

        });

        // get the most frequent value
        d.speach = _.chain(pos).countBy().pairs().max(_.last).head().value() || null;
      } else {

        // otherwise, try and look it up
        possib = _.find(worddata.words, function(w) {
          return _.contains(w.aliases, stem);
        });

        // substitute the correct stuff
        if (possib) {
          d.speach = possib.speach;
          // d.action = possib.action || null;
          actions.push(possib.action);
        }
      }

      // callback
      callback(null, d);
    });


  }

  // run through each iteration
  async.map(words, lookupWord, function(err, result) {
    callback({
      words: result,
      actions: actions
    });
  });

};

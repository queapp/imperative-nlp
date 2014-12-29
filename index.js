var _ = require("underscore");
var request = require("request");
var natural = require("natural");

var action = require("./nlp");
var host = "http://127.0.0.1:8000";

// the query

// stem a whole array
var stemArray = function(array) {
  stems = [];
  array.forEach(function(i) {
    stems.push( natural.PorterStemmer.stem(i) );
  });

  return stems;
}


// finds the record that matches the best, out of all the choices
var getCorrectRecord = function(raw, callback) {
  action(raw, {}, function(data) {

    // sample services list
    // plugins = [
    //   {
    //     name: "gmail",
    //     desc: "Check email remotely",
    //     id: 0,
    //     tags: ["email", "gmail", "mail", "webmail"],
    //     data: {}
    //   }
    // ]

    // console.log(data)

    // function() {
      // var plugins = JSON.parse(body).data;
      var plugins = [
        {
          name: "spark",
          desc: "sample plugin",
          data: {
            led: {
              value: false
            }
          }
        }
      ];

      // try to match the query to a plugin
      var count = [];
      _.each(plugins, function(p) {
        inputTotal = 0;
        _.each(data.words, function(word) {

          // find the common synonyms/tags between the plugin and the word
          // all parts of the plugin (that matter)
          allparts = _.compact( _.union([p.name], p.desc.split(' '), p.tags, [p.location]));
          // common words
          var common = _.intersection(word.synonyms, allparts);

          if (common.length) {
            // get the length of the matched words
            pct = _.reduce(common, function(memo, val) {
              return memo + val.length;
            }, 0);

            // add it to the total of matched words for the input
            inputTotal += pct;
          }

        });

        // add the total to the collective count
        count.push(inputTotal);
      });

      // console.log(count)


      // now, find out which plugin won
      var winner = _.max(count);
      if (winner > 1) {
        var winningPlugin = plugins[count.indexOf(winner)];
        console.log("contest winner had value of", winner, "matching chars", winningPlugin);

        // print the winners
        callback({
          raw: raw,
          words: data.words,
          actions: data.actions,
          winner: winningPlugin,
          winningValue: winner
        });
      } else {
        // not within threshhold
        callback(null);
      }
    // }();

  });
};

var getDataItemWithinInfo = function(str, callback) {
  getCorrectRecord(str, function(winned) {
    console.log(typeof winned.words)

    // no matches for the string
    if (!winned) {
      callback(null, "NOMATCHES");
      return
    }

    // what type of request?
    _.each(typeTests, function(explst, type) {
      _.each(explst, function(exp) {
        m = exp.exec(winned.raw);
        if (m && m.length) {
            
          // ok, got the request type.
          // what exactly are we testing?

          console.log("ABCD", winned)

          // go through each data item, and
          // get its value. Then, compare it to
          // the main corpus

          dataitems = [];
          _.each(winned.winner.data, function(v, kk) {
            dataitems.push( v.label || kk );
          });

          // stem the array
          dataitems = stemArray(dataitems);

          dataitems.forEach(function(item) {
            // compare it with the important words
            allparts = stemArray(
              _.compact(
                _.union(
                  [winned.winner.name], 
                  winned.winner.desc.split(' '), 
                  winned.winner.tags, 
                  [winned.winner.location]
                )
              )
            );
            // common words
            var common = _.intersection(allparts, query);

            console.log(allparts)

          });


        }
      });
    });

  });


};

// perform the query
var str = process.argv.slice(2).join(" ");
var typeTests = {
  equality: [/(.*) equals?(?: to)? (.*)/gi],
  enable: [/(.*) on (?:the )?(.*)/gi, /enable/gi]
}
getDataItemWithinInfo(str, function(status, type, plugin, key, value) {
  console.log(status, type, plugin, key, value)
})

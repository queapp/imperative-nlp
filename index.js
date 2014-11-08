var _ = require("underscore");
var request = require("request");
var natural = require("natural");

var action = require("./nlp");
var host = "http://127.0.0.1:8000";

// the query

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

    request.get(host+"/things/all", function(error, response, body) {
      var plugins = JSON.parse(body).data;

      // try to match the query to a plugin
      var count = [];
      _.each(plugins, function(p) {
        inputTotal = 0;
        _.each(data.words, function(word) {

          // find the common synonyms/tags between the plugin and the word
          var common = _.intersection(word.synonyms, p.tags);

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
    });

  });
};

var getDataItemWithinInfo = function(str, callback) {
  getCorrectRecord(str, function(winned) {
    // console.log(winned.words)

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
          // the correct request STEM THE HEAD/TAIL
          head = m[1].split(" ");
          tail = m[2].split(" ");

          // search for tail in the label of each item
          // var common = _.intersection(word.synonyms, p.tags);
          request.get(host+"/things/all", function(error, response, body) {
            var plugins = JSON.parse(body).data;

            // try to match the query to a plugin
            // create a small corpus for each data item
            // inside each thing or service
            var count = [];
            // _.each(plugins, function(p) {
              p = winned.winner;
              _.each(p.data, function(v, k) {

                // initialize corpus
                var corpus = [k];

                // add all aplicable data to corpus
                _.each(v, function(vv, vk) {
                  corpus = _.union(
                    corpus,
                    vv.toString().toLowerCase().split(" ")
                  );
                });

                // lastly, use the stem of each word in the corpus
                _.each(corpus, function(c, indx) {
                  corpus[indx] = natural.PorterStemmer.stem(c);
                });

                // test the corpus
                if ( _.intersection(corpus, tail).length !== 0 ) {
                  // corpus is acceptable!
                  callback && callback(true, type, p, k, p.data[k].value);
                  callback = null;
                }


              });
            // });



            callback && callback(null);
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

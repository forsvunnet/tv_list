jQuery.fn.sortElements = (function(){

  var sort = [].sort;

  return function(comparator, getSortable) {

      getSortable = getSortable || function(){return this;};

      var placements = this.map(function(){

          var sortElement = getSortable.call(this),
              parentNode = sortElement.parentNode,

              // Since the element itself will change position, we have
              // to have some way of storing its original position in
              // the DOM. The easiest way is to have a 'flag' node:
              nextSibling = parentNode.insertBefore(
                  document.createTextNode(''),
                  sortElement.nextSibling
              );

          return function() {

              if (parentNode === this) {
                  throw new Error(
                      "You can't sort elements if any one is a descendant of another."
                  );
              }

              // Insert before flag:
              parentNode.insertBefore(this, nextSibling);
              // Remove flag:
              parentNode.removeChild(nextSibling);

          };

      });

      return sort.call(this, comparator).each(function(i){
          placements[i].call(getSortable.call(this));
      });

  };
})();

// Array values to object keys
function oc(a) {
  var o = {};
  for(var i=0;i<a.length;i++) { o[a[i]]=''; }
  return o;
}
var cache_put = function(cache, id, value) {
  localStorage['tv_list_cache' + cache + '_cache' + id] = JSON.stringify(value);
};
var cache_get = function(cache, id) {
  var json = localStorage['tv_list_cache' + cache + '_cache' + id];
  return json ? JSON.parse(json) : json;
};
$(document).ready(function(){
  // Prepare the spaghetti code:
  var now = new Date().getTime();
  var showlist = {}; // <- is saved / recovered
  var registered = [];
  var html_list = $('ul#list');
  var list = {};
  var i;
  var loading = true;
  // Update the listing
  // - is called whenever:
  var updateListing = function() {
    // Should the list be saved to file?
    var save = false;
    for (var i in showlist) {
      if (!(i in oc(registered))) {
        save = true;
        var show = showlist[i];
        list[i] = {
          container:$('<li>'),
          title:$('<span>').text(show.title),
          next:$('<dd>').addClass('next'),
          previous:$('<dd>').addClass('prev')
        };
        //Structure item:
        list[i].container.append(
          list[i].title,
          $('<dl>').append(
            // Next
            $('<dt>').addClass('next').text('Next:'),
            list[i].next,
            // Previos
            $('<dt>').addClass('prev').text('Previous:'),
            list[i].previous
          )
        );

        // Attach the list to DOM
        html_list.append(list[i].container);

        // Calls get_episodes with the newest season number
        get_season_number(show.tvdb_id, get_episodes);

        // Register the show:
        registered.push(i);
      }
    }
    if (!loading && save) {
      // Save the list to file
      saveList();
    }
  };
  $.getJSON('show.json', function(data) {
    // Retrieve the local list of shows:
    for (var i in data) {
      var show = data[i];
      showlist[show.tvdb_id] = show;
    }
    // Put the list in html and retrieve the show data
    updateListing();
    loading = false;
  });

  var results = $('ul#search-results');
  var searching = false;

  // Search for new shows
  $('form').submit(function() {
    // Don't trigger a new search if there is an ongoing one
    if (!searching) {
      // The search function requires spaces to be +'s
      var search_string = $('#search').val().replace(' ', '+');
      $.getJSON('api.php?search=' + encodeURIComponent(search_string), function(data){
        //console.log(data);
        results.html(''); // Clear list
        var show;
        var select_show = function(){
          var storage = show;
          return function(){
            showlist[storage.tvdb_id] = storage;
            updateListing();
          };
        };
        for (var series in data) {
          show = data[series];
          results.append(
            $('<li>').text(show.title).click(select_show())
          );
        }
        results.removeClass('fade');
        searching = false;
      });
      searching = true;
    } else {
      console.log('Search already in progress');
    }
    results.addClass('fade');
    return false;
  });

  var saveList = function() {
    // Save list to disk
    $.post('api.php', showlist);
  };

  // Function callbacks the latest season data
  var get_season_number = function(show_id, callback) {
    // Look for the season in the cache
    var season = cache_get('season', show_id);
    if (season) {
      callback(season);
    }
    else {
      // If the cache yielded no result, retrieve new data:
      $.getJSON('api.php?seasons=' + show_id,function(data){
        var season = {season:-1};
        for (var i in data) {
          if (data[i].season > season.season) {
            season = data[i];
          }
        }
        season.show_id = show_id;

        // Put the show in cache
        cache_put('season', show_id, season);

        // Do something with the results
        callback(season);
      });
    }
  };

  // Sort the results as they pop in
  var sort_results = function () {
    $('ul#list li').sortElements(function(a, b){
      var astr = $(a).find('dd.prev').text();
      var bstr = $(b).find('dd.prev').text();

      if (astr === '') {
        return 1;
      }
      var ai = parseInt(astr.match(/^[^d]*/)[0], 10);
      var bi = parseInt(bstr.match(/^[^d]*/)[0], 10);
      return ai > bi ? 1 : -1;
    });
    $('ul#list li').addClass('even');
    $('ul#list li:odd').removeClass('even').addClass('odd');
  };

  // Function callbacks the previous and next episode
  var get_episodes = function(season) {
    var previous = false;
    var next = false;
    var sort_episodes = function(data) {
      cache_put('episodes', season.season + '_' + season.show_id, data);
      for (var i in data) {
        var episode = data[i];

        // Get the date of the episode
        var d = new Date();
        d.setTime(episode.first_aired * 1000);

        // Convert air date to days ago / to
        episode.air_date = d.toString();
        episode.days = (now / 1000 - episode.first_aired) / (24 * 60 * 60);

        // Split episodes into next and previous
        // Less than 0.5 days ago
        if (episode.days < 0.5) {
          // No existing episode
          if (!next) {
            next = episode;
          }
          // episode greater than next days ago
          else if (episode.days > next.days) {
            next = episode;
          }
        }
        // More than half a day ago
        else {
          if (!previous) {
            previous = episode;
          }
          // Episode less than previous days ago
          else if (episode.days < previous.days) {
            previous = episode;
          }
        }
      }

      if (list.hasOwnProperty(season.show_id)){
        if (next) {
          list[season.show_id].next.text(
            Math.round(0 - next.days) +
            'd S' + season.season + 'E' + next.episode
          );
          if (next.episode == 1) {
            // First episode of season
            // The previos episode does not exist or belongs to the previous season
            previous = false;
          }
        }
        if (previous) {
          list[season.show_id].previous.text(
            Math.round(previous.days) +
            'd S' + season.season + 'E' + previous.episode
            );
          sort_results();
        }
      }
    };

    var episodes = cache_get('episodes', season.season + '_' + season.show_id);
    if (episodes) {
      sort_episodes(episodes);
    }
    else {
      $.getJSON('api.php?season=' + season.season+ '&id=' + season.show_id, sort_episodes);
    }
  };
  /*
  $.getJSON('api.php?seasons=260485',function(data){
    for (i in data) {
      var season = data[i];
      //console.log(season);
    }
  });
  $.getJSON('api.php?season=1&id=260485',function(data){
    for (i in data) {
      var d = new Date();
      var episode = data[i];
      d.setTime(episode.first_aired*1000);
      episode.air_date = d.toString();
      //console.log(episode);
    }
  });
  //*/
});
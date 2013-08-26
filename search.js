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
function oc(a) {
  var o = {};
  for(var i=0;i<a.length;i++) {
    o[a[i]]='';
  }
  return o;
}
$(document).ready(function(){
  var now = new Date().getTime();
  var showlist = {}; // <- is saved / recovered
  var registered = [];
  var html_list = $('ul#list');
  var list = {};
  var i;
  var loading = true;
  var updateListing = function(){
    var save = false;
    for (var i in showlist) {
      if (!(i in oc(registered))) {
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
        html_list.append(list[i].container);
        getSeasonNumber(show.tvdb_id, getEpisodes);
        //console.log(show);
        registered.push(i);
        save = true;
      }
    }
    if (!loading && save) {
      saveList();
    }
  };
  $.getJSON('show.json', function(data){
    for (var i in data) {
      var show = data[i];
      showlist[show.tvdb_id] = show;
    }
    updateListing();
    loading = false;
  });

  var results = $('ul#search-results');
  var searching = false;
  $('form').submit(function(){
    if (!searching) {
      console.log('searching for:' + $('#search').val());
      $.getJSON('api.php?search=' + encodeURIComponent($('#search').val()), function(data){
        //console.log(data);
        results.html(''); // Clear list
        var show;
        var click = function(){
          var storage = show;
          return function(){
            showlist[storage.tvdb_id] = storage;
            updateListing();
          };
        };
        for (var series in data) {
          show = data[series];
          results.append(
            $('<li>').text(show.title).click(click())
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

  var saveList = function(){
    console.log('Saving list');
    $.post('api.php', showlist);
  };

  // Function callbacks the latest season data
  var getSeasonNumber = function(show_id, callback) {
    $.getJSON('api.php?seasons=' + show_id,function(data){
      var season = {season:-1};
      for (var i in data) {
        if (data[i].season > season.season) {
          season = data[i];
        }
      }
      // console.log(season);
      season.show_id = show_id;
      callback(season);
    });
  };

  var sort_results = function () {
    $('ul#list li').sortElements(function(a, b){
      var astr = $(a).find('.prev').next().text();
      var bstr = $(b).find('.prev').next().text();
      var ai = parseInt(astr.match(/^[^d]*/)[0], 10);
      var bi = parseInt(bstr.match(/^[^d]*/)[0], 10);
      return ai > bi ? 1 : -1;
    });
    $('ul#list li').addClass('even');
    $('ul#list li:odd').removeClass('even').addClass('odd');
  };

  // Function callbacks the previous and next episode
  var getEpisodes = function(season) {
    var previous = false;
    var next = false;
    $.getJSON('api.php?season=' + season.season+ '&id=' + season.show_id, function(data){
      for (var i in data) {
        var d = new Date();
        var episode = data[i];
        d.setTime(episode.first_aired*1000);
        episode.air_date = d.toString();
        episode.days = (now/1000 - episode.first_aired)/(24*60*60);
        // console.log(episode);
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
      //console.log('147 is where the party\'s at');
      if (list.hasOwnProperty(season.show_id)){
        if (previous) {
          list[season.show_id].previous.text(
            Math.round(previous.days) +
            'd S' + season.season + 'E' + previous.episode
            );
          sort_results();
        }
        if (next) {
          list[season.show_id].next.text(
            Math.round(next.days) +
            'd S' + season.season + 'E' + next.episode
            );
        }
      }
    });
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
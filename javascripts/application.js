// globals
var megaplaya = false;
var search_visible = true;
var keyboard_disabled = false;

// parse any hashbangs and use that as search right away
$(document).ready(function(){

  load_player();
  redraw();

  if(window.location.hash){
    set_query_from_hash();
  }
  else {
    randomize_query();
  }

});

$(window).bind('hashchange', function() {
  set_query_from_hash();
  execute_search(get_query_from_hash());
});

$(window).resize(redraw);


function redraw() {
  // $('#player').css('height', ($(window).height() * 0.5) + 'px');
  // $('#player').css('width', ($(window).width() * 0.5) + 'px');

  // $('#background').css('height', $(window).height() + 'px');
  // $('#background').css('width', $(window).width() + 'px');

  // if (search_visible) {
  //   $('#showme').css('top', ($('#search_wrapper').position().top - $('#showme').height() + 60) + 'px');
  // }
  // else {
  //   $('#showme').css('top', ($(window).height() - $('#showme').height()) + 'px');
  // }
  // $('#showme').css('left', ($(window).width() / 2 - $('#showme').width() / 2) + 'px');

  $('#search_wrapper').css('width', $(window).width() + 'px');
  $('#search_wrapper').css('top', $(window).height() / 2 - 243 / 2);

  // if doc-width < #search_wrapper width, offset it so things remain centered
  if($(window).width() < $('#query').width()) {
    $('#search_wrapper').css('left', (($(window).width() - $('#query').width())/2) + 'px');
  }
}

function skip_video(){
  if(!megaplaya){
    debug("Megaplaya not loaded, can't skip yet");
    return false;
  }

  debug("Skipping video...");
  megaplaya.api_nextVideo();
}

function get_query(){
  return $('#query')[0].value;
}

function set_query(query){
  $('#query')[0].value = query;
}

function get_query_from_hash(){
  return window.location.hash.replace('#', '').replace(/_/g, ' ');
}

function set_query_from_hash(){
  if(window.location.hash) {
    var hash = get_query_from_hash();
    set_query(decodeURIComponent(hash));
  }
}

function random_query(){
  var queries = ['jerome arizona'];
  return shuffle(queries)[0];
}

function randomize_query(){
  set_query(random_query());
}

function load_player(){
  $('#player').flash({
    swf: 'http://vhx.tv/embed/megaplaya',
    width: '100%;',
    height: '100%',
    allowFullScreen: true,
    allowScriptAccess: "always"
  });
}

function toggle_search(){
  if(search_visible){
    hide_search();
  }
  else {
    show_search();
  }
}

function show_search(){
  if (search_visible){
    debug("show_search(): already visible but showing anyway");
    // return;
  }

  $('#search').fadeIn('fast', function(){ $('#query').select(); });

  search_visible = true;
}

function hide_search(){
  if(!search_visible){
    return;
  }

  $('#query').blur();
  $('#search').fadeOut('slow');

  search_visible = false;
}

function megaplaya_loaded(){
  debug(">> megaplaya_loaded()");
  megaplaya = $('#player').children()[0];

  $(window).keydown(handle_keydown);
  // megaplaya.api_addListener('onKeyboardDown', handle_megaplaya_keydown);

  if(window.location.hash){
    debug("hash is present, executing searching!");
    $('#search').hide();
    execute_search(get_query_from_hash());
  }
  else {
    show_search();
  }
}

function disable_keyboard(){
  keyboard_disabled = true;
}

function enable_keyboard(){
  keyboard_disabled = false;
}

function handle_keydown(e){
  if(keyboard_disabled || !megaplaya || e.shiftKey || e.ctrlKey || e.metaKey){
    return true;
  };

  var code = e.keyCode;
  switch(code){
  case 32: // Spacebar
    debug("SPACEBAR");
    megaplaya.api_toggle();
    break;
  case 37: // Left arrow
    debug("<--");
    megaplaya.api_prevVideo();
    break;
  case 39: // Right arrow
    debug("-->");
    megaplaya.api_nextVideo();
    break;
  }
  return true;
}

function submit_search(){
  var query = get_query();
  if(query == undefined || query == ''){
    debug(">> no query specified, doing something at random");
    query = random_query();
  }
  else {
    debug(">> search() query="+query);
  }
  var encoded = '#'+encodeURIComponent(query.replace(/\s/g, '_'));
  window.location.hash = encoded;
  // hashchange then executes search()
}

function execute_search(query){
  $('#player').show();
  hide_search();

  geocode(query);
}

function geocode(address){
  debug("Geocoding "+address);
  var apiKey = "ABQIAAAAkJh4Fvma2qHzJNXSWaN0exQ1JX0OBKUA4qobCpgJkpABB2M8OxSBgSurNtfbpQazJk7yw9qmHMSuCA";
  $.getJSON("http://maps.google.com/maps/geo?q="+ address+"&key="+apiKey+"&sensor=false&output=json&callback=?", geocode_callback);
}

function geocode_callback(data, status){
  debug(">> geocode_callback()", data);

  var coords = data.Placemark[0].Point.coordinates;
  var radius = '15mi';

  geosearch_youtube(coords, radius);
}

function geosearch_youtube(coords, radius){
  debug("geosearch_youtube", coords, radius);
  var resultsCount = 50;

  debug(coords[1]+","+coords[0]);
  // var query = 'fun';
  var url = 'http://gdata.youtube.com/feeds/videos?&alt=json-in-script' +
            // '&vq=' + query +
            // '&orderby=relevance&sortorder=descending&max-results=' + resultsCount +
            '&orderby=viewCount&sortorder=ascending&max-results=' + resultsCount +
            '&callback=geosearch_youtube_callback' +
            '&location='+coords[1]+','+coords[0]+'!&location-radius='+radius +
            '&format=5&fmt=18';

  var script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', url);
  document.documentElement.firstChild.appendChild(script);
}

function geosearch_youtube_callback(resp){
  debug(">> geosearch_youtube_callback()", resp);

  if(resp.feed.entry == undefined) {
    set_query("No results, sorry dawg");
    show_search();
    return false;
  }

  var urls = $.map(resp.feed.entry, function(entry,i){ return {url: entry.link[0].href}; });
  debug(">> search_youtube_callback(): loading "+urls.length+" videos...");

  $('#player').show();
  $('#player').css('z-index', 10);

  urls = shuffle(urls);
  return megaplaya.api_playQueue(urls);
}


function debug(string){
  try {
    if(arguments.length > 1) {
      console.log(arguments);
    }
    else {
      console.log(string);
    }
  } catch(e) { }
}

function shuffle(v){
  for(var j, x, i = v.length; i; j = parseInt(Math.random() * i, 0), x = v[--i], v[i] = v[j], v[j] = x);
  return v;
}

<?php
//28af2072e1d7bae2f123af7ebd070228
//http://trakt.tv/api-docs/search-shows
//http://api.trakt.tv/search/shows.json/28af2072e1d7bae2f123af7ebd070228/ripper

if (isset($_GET['search'])) {
  $search = $_GET['search'];
  $url = "http://api.trakt.tv/search/shows.json/28af2072e1d7bae2f123af7ebd070228/" . $search;
  header('HTTP/1.1 200 Ok', true, 200);
  echo file_get_contents($url);
  die();
}

if (isset($_GET['seasons'])) {
  $seasons = $_GET['seasons'];
  $url = "http://api.trakt.tv/show/seasons.json/28af2072e1d7bae2f123af7ebd070228/" . $seasons;
  header('HTTP/1.1 200 Ok', true, 200);
  echo file_get_contents($url);
  die();
}
if (isset($_GET['season'], $_GET['id'])) {
  $season = $_GET['season'];
  $id = $_GET['id'];
  $url = "http://api.trakt.tv/show/season.json/28af2072e1d7bae2f123af7ebd070228/" . $id . '/' . $season;
  header('HTTP/1.1 200 Ok', true, 200);
  echo file_get_contents($url);
  die();
}
if (count($_POST)>0){
  if (file_put_contents('show.json', json_encode($_POST)));
    die();
}

header('HTTP/1.1 400 Bad Request', true, 400);
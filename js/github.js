getContents = function (owner, repo, path) {
  var tmp = null;
  $.ajax({
    async: false,
    url: "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path,
    data: {
      access_token: '<INSERT YOUR OWN>'
    },
    success: function (data) {
      for (c in data) {
        if (data[c].type == 'dir') {
          data[c].children = getContents(owner, repo, data[c].path);
        }
      }
      tmp = data;
    }
  });
  return tmp;
}

getRepo = function (owner, repo) {
  if (owner == "atom" && repo == "atom")
    return
  return getContents(owner, repo, '');
}
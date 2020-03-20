function show_help_if_enabled() {
  var help_enabled = getCookie("help_bother_me");
  if (help_enabled === null || help_enabled == "bother_me_please") {
    document.getElementById("help_bother_me").checked = "true";
    show_help();
  }
}

function show_help() {
  document.getElementById("help_overlay").style.display = "block";
}

function unshow_help() {
  var help_enabled = document.getElementById("help_bother_me").checked;
  var cookie_val = "dont_bother_me";
  if (help_enabled) {
    cookie_val = "bother_me_please";
  }
  setCookie("help_bother_me",cookie_val,60);
  document.getElementById("help_overlay").style.display = "none";
}

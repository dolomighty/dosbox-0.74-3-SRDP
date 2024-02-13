
function $(what) {
  var obj = ("string" == typeof what) ? document.getElementById(what) : what
  return obj
}

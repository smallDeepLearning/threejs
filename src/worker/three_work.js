self.addEventListener("message", function(e) {
  var data = e.data;
  switch(data.cmd) {
    case "action":
      console.log(data.msg);
      self.postMessage("先锋，在！");
      break;
    case "stopit":
      console.log(data.msg);
      self.close();
  }
  
}, false);

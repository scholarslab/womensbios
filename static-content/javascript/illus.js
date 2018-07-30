function displayIllus(illus, caption)
{
  var generator=window.open('','name','height=700px,width=960px, scrollbars=1, resizable=1');
  cap = (unescape(caption));
  cap = cap.replace(/hi rend="italics"/gi, "em");
  cap = cap.replace(/\/hi/gi, "/em");  
  
  generator.document.write('<html><head><title>Image</title><link rel="stylesheet" href="style.css"></head><body id=\'image-wrap\'><div class=\'head1\'>' + cap  + '</div><img src=\"full/' + illus + '.jpg\"><div class=\'head2\'><a href="javascript:self.close()">Close this window</a>.</div></body></html>');
  generator.document.replace();
  generator.document.close();
}
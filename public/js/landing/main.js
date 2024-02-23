jQuery(document).ready(function(){
    $('.counter').counterUp({
        delay: 10,
        time: 4000
    });
})

$('.work').magnificPopup({
    delegate: 'a',
    type: 'image',
    gallery: {
        enabled: true
      }
  });


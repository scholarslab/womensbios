$(function () {
	$('.toggle_link') .click(function(){
		var id = $(this) .attr('id').split('_')[1];
		$('#' + id + '_p') .toggle();
		if ($('#' + id + '_div') .attr('class') == 'hidden'){
			$('#' + id + '_div') .fadeIn('slow');
			$('#' + id + '_div') .attr('class', 'visible');
			$(this) .html('Hide Essay...');
		}
		else if ($('#' + id + '_div') .attr('class') == 'visible'){
			$('#' + id + '_div') .fadeOut('fast');
			$('#' + id + '_div') .attr('class', 'hidden');
			$(this) .html('Read more...');
		}
		
	});
});
document.addEventListener("DOMContentLoaded", function (event) {

    $('#submit-acceptance').click(function () {
        var t_id = $('#request-id').attr('request-id');
        var data = {
            id: t_id,
            _csrf: $('#csrf_token').val(),
            message: $('#text-input').val(),
        };
        $.ajax({
            url: '/acceptRequest',
            method: 'POST',
            data: data,
        }).done(function (data) {
            var request_info = $('[data-id="' + t_id + '"]');
            $('[data-id="' + t_id + '"]').hide('slide', {direction: 'right'}, 1000, function () {
                // 'Move' the request info box from the proposed column to the upcoming
                // column and change CSS classes so the right divs get hidden/shown
                $(request_info).removeClass($(request_info).attr('data-status'));
                $(request_info).addClass(data.status);
                $(request_info).attr('data-status', data.status);
                $($('.transaction-table')[1]).append(request_info);
                $($('.transaction-table')[1]).find('.request-info').show();
                get_messages(request_info);
                // Force a click to go to the 'Upcoming' tab
                ($('.exchange-type')[1]).click();
            });
        });
        $('#acceptModal').modal('hide');

        return false;
    });

    $('.chat').click( function () {
        var request_info = $(this).closest('.request-info');
        $(request_info).addClass('message-mode');
    });

    $('.back-button').click( function () {
        var request_info = $(this).closest('.request-info');
        $(request_info).removeClass('message-mode');
    });

    $('.reject').click( function () {
        $(this).closest('.request-info').hide('slide',{direction:'right'},1000);
        $.ajax({
            url: '/rejectRequest/' + $(this).closest('.request-info').data('id'),
            method: 'GET',
        }).done(function (data) {
            console.log(data);
        });
    });

    $('.cancel').click( function () {
        $(this).closest('.request-info').hide('slide',{direction:'right'},1000);
        $.ajax({
            url: '/cancelRequest/' + $(this).closest('.request-info').data('id'),
            method: 'GET',
        }).done(function (data) {
            console.log(data);
        });
    });

    function newChatBubble (message) {
        var klass = message.author.isMe ? 'myself' : 'other-person';
        var chat = '<div class="message-details {who}">'.replace('{who}', klass) +
                        '<div class="comment">{comment}</div>'.replace('{comment}', message.message) +
                        '<div class="author">{author}</div>'.replace('{author}', message.author.name) +
                    '</div>';
        return chat;
    }

    function serializeDate (date) {
        return date.getHours() + ':' + ('0'+ date.getMinutes()).slice(-2);
    }

    var socket = io();
    $('.message-form').submit(function () {
        var message_text = $(this).find('.text-input').val();
        if (!message_text) {
            return false;
        }
        var packet = {
            message: message_text,
            t_id: $(this).closest('.request-info').data('id'),
        };

        socket.emit('send message', packet);
        $('.text-input').val('');

        return false;
    });

    socket.on('new message', function (data) {
        var match = $('.transaction-table').find('[data-id="' + data.transaction._id + '"]');
        // If its a message for an existing transaction, and that transaction has conversation
        // div already set up, then append it.
        if (match.length > 0 && $(match[0]).find('.conversation').length > 0) {
            var request = match[0];

            // If its a message for the current thread, make a new chat bubble and append it
            // otherwise just set that thread to be 'pending'
            var new_element = newChatBubble(data);
            $(request).find('.conversation').append(new_element);
            $(request).find('.conversation').scrollTop($(request).find('.conversation')[0].scrollHeight);

            return;
        } else {
            console.log("Couldn't find transaction with id " + data.transaction._id);
        }
    });

    function get_messages (request_info) {
        $.ajax({
            url: '/_transactionMessages/' + $(request_info).data('id'),
        }).done(function (response) {
            $(request_info).find('.conversation').empty();
            response.data.map(function (message) {
                var chat = newChatBubble(message);
                $(request_info).find('.conversation').append(chat);
            });
            $(request_info).find('.conversation').scrollTop($(request_info).find('.conversation')[0].scrollHeight);
        });
    }

    function createReview (data) {
        var rating = '';
        for (var i = 0; i < data.rating; i++) {
            rating += '<span>★</span>';
        }
        var review = '<div class="review">' +
                        '<div class="rating">' +
                            rating +
                        '</div>' +
                        '<time class="review-timestamp">' +
                            data.timestamp +
                        '</time>' +
                        '<quote>' +
                            data.text +
                        '</quote>' +
                     '</div>';
        return review;
    }

    $('.see-more').click(function () {
        var type = $(this).attr('href');
        var request_info = $(this).closest('.request-info');
        if ($(request_info).attr('data-status').indexOf('accepted') >= 0) {
            get_messages(request_info);
            // FIgure out how to know if curr user hasn't confirmed it
        } else if ($(request_info).attr('data-status').indexOf('complete') >= 0) {
            $.ajax({
                url: '/_transactionReviews/' + $(request_info).data('id'),
            }).done(function (response) {
                var notice = '';
                if (response.curr_user_has_review == false) {
                    var review_button = '<button class="btn btn-success" data-toggle="modal" data-target="#reviewModal">' +
                                            'Write Review' +
                                        '</button>';
                    notice = '<div>' +
                                    'Please write a review for this exchange. ' +
                                    'You won\'t be able to see your partner\'s review until you write one' +
                                 '</div>';
                    $(request_info).find('.notice').html(notice + review_button);
                } else if (response.partner_has_review == false) {
                    notice = '<div>' +
                                'Thank you for submitting a review. ' +
                                'As soon as your partner submits one, you\'ll be able to see it!' +
                             '</div>';
                    $(request_info).find('.notice').html(notice);
                } else {
                    $(request_info).find('.reviews').html(createReview(response.review));
                }
            });
        }
    });

    $('#acceptModal').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget); // Button that triggered the modal
        var id = button.closest('.request-info').data('id');
        var skill_label = button.closest('.request-info').find('.content .skill-label').html();
        var modal = $(this);
        modal.find('.modal-body #request-id').attr('request-id', id);
        modal.find('.modal-body .statement').html('Get ready for ' + skill_label);
    });

    $('#submit-review').click(function () {
        var rating = 1;
        $('.rating span').each(function (i, obj) {
            if ($(obj).hasClass('selected')) {
                rating = 5 - i;
            }
        });
        var data = {
            t_id: $('#transaction-id').attr('transaction-id'),
            _csrf: $('#review-csrf_token').val(),
            message: $('#review-text-input').val(),
            rating: rating
        };
        $.ajax({
            url: '/submitReview',
            method: 'POST',
            data: data,
        }).done(function (response) {
            console.log(response);
        });
        $('#reviewModal').modal('hide');
        return false;
    });

    $('.rating span').click(function () {
        $('.rating span').removeClass('selected');
        $(this).addClass('selected');
    });

    function confirmExchange (t_id) {
        $.ajax({
            url: '/confirmExchange/' + t_id,
            method: 'GET',
        }).done(function (data) {
            var request_info = $('[data-id="' + t_id + '"]');
            var old_status = $(request_info).attr('data-status');

            // If it's accepted, that means it was in the upcoming column, so we
            // should slide it out of view. Maybe change this to instead check the
            // actual column that it is in instead of using status proxy
            if (old_status == 'accepted') {
                $('[data-id="' + t_id + '"]').hide('slide', {direction: 'right'}, 1000, function () {
                    $(request_info).removeClass(old_status);
                    $(request_info).addClass(data.status);
                    $(request_info).attr('data-status', data.status);
                    $($('.transaction-table')[2]).append(request_info);
                    $($('.transaction-table')[2]).find('.request-info').show();
                });
            } else {
                $(request_info).removeClass(old_status);
                $(request_info).addClass(data.status);
                $(request_info).attr('data-status', data.status);
            }
        });
    }

    $('#reviewModal').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget) // Button that triggered the modal
        var request = button.closest('.request-info');
        var id = request.data('id');
        var status = request.attr('data-status');

        if (status != 'complete') {
            confirmExchange(id);
        }

        var skill_label = button.closest('.request-info').find('.content .skill-label').html();
        var modal = $(this);
        modal.find('.modal-body #transaction-id').attr('transaction-id', id);
        modal.find('.modal-body #review-activity').val(skill_label);
    });

    $('.exchange-type').click(function () {
        $('.exchange-type').removeClass('selected');
        $(this).addClass('selected');
        var index = $('.exchange-type').index($(this));
        $('.transaction-table').hide();
        $('.transaction-table').eq(index).fadeIn();
    });

    $('.suggest').click(function () {
        var request = $(this).closest('.request-info');
        var location = $(request).find('input[name=location]:checked').val();
        var foo = $(request).find('.datetimepicker');
        var date = $(foo).data("DateTimePicker").date();
        console.log(date.valueOf())
    });

    $('.datetimepicker').datetimepicker();
});

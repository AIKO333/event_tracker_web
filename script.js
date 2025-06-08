document.addEventListener('DOMContentLoaded', function() {

    const profileData= document.getElementById('profileData').getAttribute('profileData');
    
    if (profileData.length > 0) {
        document.getElementById('profileForm').classList.add('hidden');
        document.getElementById('website_inside').classList.remove('hidden');
    }
    else
    {
        document.getElementById('profileForm').classList.remove('hidden');
        document.getElementById('website_inside').classList.add('hidden');
    }


    document.getElementById('profileForm').addEventListener('submit', function(event) {
        event.preventDefault();
	    
        document.getElementById('profileForm').classList.add('hidden');
        document.getElementById('website_inside').classList.remove('hidden');
    });

    const profileForm = document.getElementById('profileForm');
    
    profileForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const formData = new FormData(profileForm);
        const formDataObject = {};
        formData.forEach((value, key) => {
            formDataObject[key] = value;
        });
        
        const response = await fetch('/submit-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formDataObject)
        });
        
        window.location.reload();
        const result = await response.text();
        alert(result);
    });

    const contactForm = document.getElementById('contactForm');
    
    contactForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = new FormData(contactForm);
        const formDataObject = {};
        formData.forEach((value, key) => {
            formDataObject[key] = value;
        });

        const response = await fetch('/submit-contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formDataObject)
        });
        
        window.location.reload();
        const result = await response.text();
        alert(result);
    });

    const messageForm = document.getElementById('messageForm');
    
    messageForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const messageContent = document.getElementById('messageContent');
    const fullMessage = document.getElementById('fullMessage');
    let message = '';

    messageContent.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            message += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'SELECT') {
                message += node.options[node.selectedIndex].text;
            } else if (node.tagName === 'SPAN' && node.hasAttribute('contenteditable')) {
                const spanText = node.textContent;
                if (spanText) {
                    message += spanText;
                } else {
                    message += node.getAttribute('data-placeholder');
                }
            } else {
                message += node.textContent;
            }
        }
    });

    fullMessage.value = message.trim();

        this.submit();

        const formData = new FormData(messageForm);
        const formDataObject = {};
        formData.forEach((value, key) => {
            formDataObject[key] = value;
        });
        
        const response = await fetch('/submit-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formDataObject)
        });
        
        window.location.reload();
        const result = await response.text();
        alert(result);
    });

    const editProfileForm = document.getElementById('editProfileForm');
    
    editProfileForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = new FormData(editProfileForm);
        const formDataObject = {};
        formData.forEach((value, key) => {
            formDataObject[key] = value;
        });
        
        const response = await fetch('/submit-edit-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formDataObject)
        });
        
        window.location.reload();
        const result = await response.text();
        alert(result);
    });

    document.getElementById('deleteProfileButton').addEventListener('click', function() {
        if (confirm("Are you sure you want to delete your profile?")) {
            fetch('/delete-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    alert('Profile deleted successfully.');
                    localStorage.setItem('isProfileSubmitted', 'false');
                    window.location.reload();
                } else {
                    alert('Error deleting profile.');
                }
            })
            .catch(error => {
                console.error('Error deleting profile:', error);
                alert('Error deleting profile.');
            });
        }
    });

});

function ShowHome()
{
    document.getElementById('home').classList.remove('hidden');
    document.getElementById('events').classList.add('hidden');
    document.getElementById('profile').classList.add('hidden');
    document.getElementById('about').classList.add('hidden');
    document.getElementById('contact').classList.add('hidden');
}

function ShowEvents()
{
    document.getElementById('events').classList.remove('hidden');
    document.getElementById('home').classList.add('hidden');
    document.getElementById('profile').classList.add('hidden');
    document.getElementById('about').classList.add('hidden');
    document.getElementById('contact').classList.add('hidden');
}

function ShowProfile()
{
    document.getElementById('profile').classList.remove('hidden');
    document.getElementById('events').classList.add('hidden');
    document.getElementById('home').classList.add('hidden');
    document.getElementById('about').classList.add('hidden');
    document.getElementById('contact').classList.add('hidden');
}

function ShowAbout()
{
    document.getElementById('about').classList.remove('hidden');
    document.getElementById('events').classList.add('hidden');
    document.getElementById('home').classList.add('hidden');
    document.getElementById('profile').classList.add('hidden');
    document.getElementById('contact').classList.add('hidden');
}

function ShowContact()
{
    document.getElementById('contact').classList.remove('hidden');
    document.getElementById('events').classList.add('hidden');
    document.getElementById('home').classList.add('hidden');
    document.getElementById('profile').classList.add('hidden');
    document.getElementById('about').classList.add('hidden');
}

function EditProfileButton(){
    document.getElementById('profile-data').classList.add('hidden');
    document.getElementById('profile-edit').classList.remove('hidden');
}

function SaveChangesButton() {
    document.getElementById('profile-edit').classList.add('hidden');
    document.getElementById('profile-data').classList.remove('hidden');
}

var eventsDataElement = document.getElementById('eventsData');
var eventsResult = JSON.parse(eventsDataElement.dataset.events);



(function($)
{
    $.fn.autogrow = function(options)
    {
        return this.filter('textarea').each(function()
        {
            var self         = this;
            var $self        = $(self);
            var minHeight    = $self.height();
            var noFlickerPad = $self.hasClass('autogrow-short') ? 0 : parseInt($self.css('lineHeight')) || 0;

            var shadow = $('<div></div>').css({
                position:    'absolute',
                top:         -10000,
                left:        -10000,
                width:       $self.width(),
                fontSize:    $self.css('fontSize'),
                fontFamily:  $self.css('fontFamily'),
                fontWeight:  $self.css('fontWeight'),
                lineHeight:  $self.css('lineHeight'),
                resize:      'none',
                'word-wrap': 'break-word'
            }).appendTo(document.body);

            var update = function(event)
            {
                var times = function(string, number)
                {
                    for (var i=0, r=''; i<number; i++) r += string;
                    return r;
                };

                var val = self.value.replace(/</g, '&lt;')
                                    .replace(/>/g, '&gt;')
                                    .replace(/&/g, '&amp;')
                                    .replace(/\n$/, '<br/>&nbsp;')
                                    .replace(/\n/g, '<br/>')
                                    .replace(/ {2,}/g, function(space){ return times('&nbsp;', space.length - 1) + ' ' });

                if (event && event.data && event.data.event === 'keydown' && event.keyCode === 13) {
                    val += '<br />';
                }

                shadow.css('width', $self.width());
                shadow.html(val + (noFlickerPad === 0 ? '...' : ''));
                $self.height(Math.max(shadow.height() + noFlickerPad, minHeight));
            }

            $self.change(update).keyup(update).keydown({event:'keydown'},update);
            $(window).resize(update);

            update();
        });
    };
})(jQuery);


var noteTemp =  '<div class="note">'
				+	'<a href="javascript:;" class="button event-remove">X</a>'
				+ 	'<div class="note_cnt">'
				+		'<textarea class="title" placeholder="Enter note title"></textarea>'
				+ 		'<textarea class="cnt" placeholder="Enter note description here"></textarea>'
				+	'</div> '
				+'</div>';

var noteZindex = 1;

function deleteNote(contactName){
    $(this).parent('.note').hide("puff",{ percent: 133}, 250);

    const response = fetch('/delete-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactName: contactName })
    });
    
    window.location.reload();
    const result = response.text();
    alert(result);
};

function newNote(contactName, eventType, date) {
    var modifiedNoteTemp = noteTemp
        .replace('Enter note title', contactName)
        .replace('Enter note description here', 'Event Type: ' + eventType + '\nDate: ' + new Date(date).toLocaleDateString('en-US', { month: 'short' }) + " " + new Date(date).toLocaleDateString('en-US', { day: '2-digit' }) + " " + new Date(date).toLocaleDateString('en-US', { year: 'numeric' }));

  $(modifiedNoteTemp).hide().appendTo("#board").show("fade", 300).draggable().on('dragstart',
    function(){
        $(this).css('z-index', ++noteZindex);
    });
 
	$('.event-remove').click(function() {
        deleteNote(contactName)
    });
	$('textarea').autogrow();

  $('.note')
	return false; 
};



$(document).ready(function() {
    
    $('.single-item').slick({
        dots: true,
        infinite: true,
        speed: 300,
        slidesToShow: 1,
        centerMode: true,
      });

    $("#board").height($(document).height());

    if(eventsResult.length > 0)
        {
            eventsResult.forEach(entry => {
                newNote(entry.contactName, entry.eventType, entry.date);

            }
        );
    }
    
    return false;
});

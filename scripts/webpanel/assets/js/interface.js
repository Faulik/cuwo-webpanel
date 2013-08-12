$(document).ready(function() {
    var ClassArray = {
        "1": "Warrior",
        "2": "Ranger",
        "3": "Mage",
        "4": "Rogue"
    };
    var PlayersArr = {};
    var Specicalizations = [
        ["Berserker", "Guardian"],
        ["Sniper", "Scout"],
        ["Fire", "Water"],
        ["Assassin", "Ninja"]
    ];
    var ErrorsArray = {
        '-1': 'ERROR_INVALID_REQUEST',
        '-2': 'ERROR_SYSTEM',
        '-3': 'ERROR_INVALID_PLAYER'
    };
    var ClassCoefArray = [1, 3, 1.1, 1, 1.2];
    var reconnection = null;
    //Common

    function health_calk(klass, spec, level) {
        var max_health = 100 * ClassCoefArray[klass] * Math.pow(2, 3 * (level - 1) / (level + 19) + 1);
        if (spec === "Guardian") {
            max_health = max_health * 1.25;
        }
        return parseInt(max_health, 10);
    }

    function make_player(data, id, update, full) {
        if (typeof update == "undefined") {
            update = false;
        }
        if (typeof full == "undefined") {
            full = false;
        }
        if (update === false) {
            PlayersArr[id] = {};
        }
        PlayersArr[id]['ip'] = data['ip'];
        PlayersArr[id]['name'] = data['name'];
        PlayersArr[id]['level'] = data['level'];
        PlayersArr[id]['power-level'] = data['power-level'];
        PlayersArr[id]['class'] = data['class'];
        var Specializ = Specicalizations[data['class'] - 1][data['specialization']];
        PlayersArr[id]['specialization'] = Specializ;
        PlayersArr[id]['health'] = health_calk(data['class'], Specializ, data['level']);
        if (full === true) {
            var skills = {
                'pet-master': data['skills'][0],
                'riding': data['skills'][1],
                'climbing': data['skills'][2],
                'hang-gliding': data['skills'][3],
                'swimming': data['skills'][4],
                'sailing': data['skills'][5],
                'class-skill-1': data['skills'][6],
                'class-skill-2': data['skills'][7],
                'class-skill-3': data['skills'][8]
            };
            var items = [];
            for (var i = 0; i < 12; i++) {
                var item_enc = data['items'][i];
                var item = {
                    'type': item_enc['type'],
                    'sub-type': item_enc['sub-type'],
                    'modifier': item_enc['modifier'],
                    'minus-modifier': item_enc['minus-modifier'],
                    'rarity': item_enc['rarity'],
                    'material': item_enc['material'],
                    'flags': item_enc['flags'],
                    'level': item_enc['level'],
                    'power-level': item_enc['power-level']
                };
                items.push(item);
            }
            PlayersArr[id]['skills'] = skills;
            PlayersArr[id]['items'] = items;

        }
        if (update === false) {
            add_player_table(id);
        } else {
            update_player_table(id);
        }
    }

    function delete_player(id) {
        delete PlayersArr[id];
        delete_player_chat(id);
        delete_player_table(id);
    }

    //Table

    function add_player_table(id) {
        var data = PlayersArr[id];
        $('table.players tbody').append("" +
            "<tr data-id=" + id + "><td class='id'>" + id + '</td>' +
            "<td class='name'>" + data['name'] + '</td>' +
            '<td class="level">' + data['level'] + '</td>' +
            '<td class="class">' + ClassArray[data['class']] + '</td>' +
            '<td class="specialization">' + data['specialization'] + '</td></tr>');
    }

    function update_player_table(id) {
        var data = PlayersArr[id];
        $("table.players tr[data-id=" + id + "] td.name").text(data['name']);
        $("table.players tr[data-id=" + id + "] td.level").text(data['level']);
        $("table.players tr[data-id=" + id + "] td.class").text(ClassArray[data['class']]);
        $("table.players tr[data-id=" + id + "] td.specialization").text(data['specialization']);
    }

    function delete_player_table(id) {
        $("table.players tr[data-id=" + id + "]").remove();
        $("table.players tr.player_controls").remove();
    }
    //Player overview

    function update_player_overview(id) {
        var data = PlayersArr[id];
        for (var i = 1; i < 13; i++) {
            var elem = $('div.over-item-' + i);
            elem.html(data['items'][i - 1]['power-level']);
            elem.addClass('rarity-' + data['items'][i - 1]['rarity']);
        }
        $('.center-part-over').html("" +
            "<span>" + data['name'] + "</span>" +
            "<span>Lvl " + data['level'] + " " + ClassArray[data['class']] + " | " + data['specialization'] + "</span>" +
            "<span>Power: " + data['power-level'] + "</span>" +
            "<span>HP: " + data['health'] + "</span>");
    }
    //Chat

    function add_player_chat(id) {
        var name = PlayersArr[id]['name'];
        $('#server-players').append('<p data-id="' + id + '">id#' + id + ' ' + name + '</p>');
    }

    function delete_player_chat(id) {
        $('#server-players p[data-id="' + id + '"]').remove();
    }

    function send_to_chat(message, id) {
        var name;
        if (id === 0) {
            name = $('#name-input').val();
        } else {
            name = PlayersArr[id]['name'];
        }
        $('#chat-messages').append('<p data-id="' + id + '"><span>' + name + '</span>: ' + message + '</p>');
        $("#chat-messages").scrollTop($("#chat-messages")[0].scrollHeight);
        if ($('#chat-messages > p').length > 200) {
            $('#chat-messages').children(":first").remove();
        }
    }
    //Handlers

    function handle_get_players(data) {
        var ids = Object.keys(data);
        var j = null;
        for (var i = 0; i < Object.keys(data).length; i++) {
            if (data[ids[i]]['name'] != "undefined") {
                j = Object.keys(PlayersArr).indexOf(ids[i]);
                if (j == -1) {
                    make_player(data[ids[i]], ids[i]);
                    add_player_chat(ids[i]);
                } else {
                    update_player(data[ids[i]], ids[i], true);
                }
            }
        }
        ids = Object.keys(PlayersArr);
        if (Object.keys(PlayersArr).length !== 0) {
            for (i = 0; i < Object.keys(PlayersArr).length; i++) {
                j = Object.keys(data).indexOf(Object.keys(PlayersArr)[i]);
                if (j === -1) {
                    delete_player_chat(ids[i]);
                    delete_player(ids[i]);
                }
            }
        }
    }

    function handle_get_player(data) {
        var id = data['entity-id'];
        make_player(data, id, true, true);
        update_player_overview(id);
    }

    function handle_on_join(data) {
        var id = data['entity-id'];
        make_player(data, id, false, true);
        add_player_chat(id);
    }

    function handle_on_leave(data) {
        var id = data;
        delete_player(id);
    }

    function handle_on_chat(data) {
        var id = data['id'];
        var name = PlayersArr[id]['name'];
        var message = data['message'];
        send_to_chat(message, id);
    }

    function websoc() {
        var socket = new WebSocket("ws://" + window.location.hostname + ":" + server_port);

        function commands_buttons() {
            if ($(this).hasClass('chosen-player') === false) {
                var parent = $(this).parent();
                parent.find('tr.chosen-player').next().remove();
                parent.find('tr.chosen-player').children(":first").removeAttr('rowspan');
                parent.find('tr.chosen-player').removeClass('chosen-player');
                var id = $(this).attr('data-id');
                $(this).addClass('chosen-player');
                $(':first-child', this).attr("rowspan", 2);
                $(this).after('<tr class="player_controls"><td colspan="4">' +
                    '<span>' + PlayersArr[id]['ip'] + '</span>' +
                    '<button type="button" title="Kick player" value="kick" class="btn btn-kick" >Kick</button>' +
                    '<button type="button" title="Ban player" value="ban" class="btn btn-ban" >Ban</button>' +
                    '<input type="text" value="" placeholder="Reason" class="text"></td></tr>');
            }
            $('table.players tbody tr.player_controls td button').off('click').on('click', function() {
                var request = $(this).val();
                var data = {
                    player: '#' + $(this).parent().parent().prev().attr('data-id'),
                    reason: $(this).parent().find('input.text').val()
                };

                socket.send(JSON.stringify({
                    request: request,
                    data: data
                }));
            });
        }
        function get_player () {
            socket.send(JSON.stringify({
                    request: 'get-player',
                    data: '#' + $(this).attr('data-id')
                }));
        }

        function send_to_server(message, name) {
            socket.send(JSON.stringify({
                request: "send-message",
                data: {
                    message: name + " " + message
                }
            }));
        }

        socket.onopen = function() {
            $('span.reconnecting').text('');
            clearInterval(reconnection);
            socket.send(auth_key);
            setTimeout(function() {
                socket.send(JSON.stringify({
                    request: 'get-players'
                }));
                socket.send(JSON.stringify({
                    request: 'subscribe',
                    data: ['on-join', 'on-leave', 'on-chat']
                }));
            }, 1000);
            socket.onmessage = function(event) {
                var sedata = JSON.parse(event.data);
                switch (sedata['response']) {
                    case 'error':
                        break;
                    case 'success':
                        switch (sedata['request']) {
                            case 'get-players':
                                handle_get_players(sedata['data']);
                                break;
                            case 'get-player':
                                handle_get_player(sedata['data']);
                                break;
                        }
                        break;
                    case 'update':
                        switch (sedata['request']) {
                            case 'on-join':
                                handle_on_join(sedata['data']);
                                break;
                            case 'on-leave':
                                handle_on_leave(sedata['data']);
                                break;
                            case 'on-chat':
                                handle_on_chat(sedata['data']);
                                break;
                        }
                        break;
                }
                $('table.players tbody tr:not(.player_controls)').off('click').on('click',get_player).on('click', commands_buttons);
            };
            

            $('#message-input').off('keypress').on('keypress', function(e) {
                if (e.which == 13) {
                    var name = $('#name-input').val();
                    if (name !== '') {
                        name.append(':');
                    }
                    send_to_chat($(this).val(), 0);
                    send_to_server($(this).val(), name);
                    $(this).val("");
                    return false;
                }
            });
            socket.onclose = function() {
                $('span.reconnecting').text('Reconnecting');
                reconnection = setInterval(function() {
                    websoc();
                }, 5000);
            };

            window.onunload = function() {
                socket.close();
            };
        };
    }

    $('ul.nav li').off('click').on('click', function() {
        var target_tab = $(this).attr('data-name');
        $('ul.nav > li.current-tab').removeClass('current-tab');
        $(this).addClass('current-tab');
        $('#Content > div:not(.hidde-tab)').addClass('hidden-tab');
        $('#Content > div#' + target_tab).removeClass('hidden-tab');
    });
    websoc();
});


/**
 * Module
 */
(
	function ( $, Backbone, Marionate, socket, MusicEngine, Views, Models, Collections ) {
		/**
		 * Current playin
		 */
		var currentPlayingRegion = Marionate.Region.extend({});
		Views.currentPlayingView = Marionette.CompositeView.extend({
			template: "#currentPlaying-template",
			events:{
				'click .vote':'onVoteRequest'
			},
			initialize:function(options){
				_.extend(this.options, options);

				this.currentSongId = 0;
				this.durationEl = null;
				this.currentEl = null;
				this.titleEl = null;
				this.backgroundEl = null;

				this.listenTo(MusicEngine.pubsub, 'song.playing', this.onSongPlaying);
				this.listenTo(MusicEngine.pubsub, 'song.pause', this.onSongPaused);
				this.listenTo(MusicEngine.pubsub, 'vote.change', this.onVoteChange);
			},
			onVoteRequest:function(e){
				e.preventDefault();
				socket.emit('vote', {action:'next'});
			},
			onVoteChange:function(data){

			},
			onRender:function(){
				this.currentEl = this.$el.find('#currentPlaying');
				this.durationEl = this.currentEl.find('.duration');
				this.titleEl = this.currentEl.find('.title');
				this.backgroundEl = this.currentEl.find('.backgroundImage');
			},
			onSongPlaying: function(data){
				this.updateInfo(data);
			},
			onSongPaused:function(data){
				this.updateInfo(data);
			},
			updateInfo:function(data){
				if(this.currentSongId != data.song.id){
					this.currentSongId = data.song.id;
					this.titleEl.text(data.song.name);
					this.backgroundEl.attr('src',data.song.image);
				}
				if(this.durationEl){
					this.durationEl.text(data.duration);
				}
			},
		});
		/**
		 * Song submit Regon
		 */
		var songSubmitRegion = Marionate.Region.extend({});
		Views.songSubmitView = Marionette.CompositeView.extend({
			template: "#songsubmit-template",
			events:{
				'submit #songSubmitForm':'onSubmit'
			},
			initialize:function(options){
				_.extend(this.options, options);
			},
			onSubmit:function(e){
				e.preventDefault();
				var $target = $( e.currentTarget);
				var $urlInput = $target.find('input[name="url"]');
				var url = $urlInput.val();
				$urlInput.val('');
				socket.emit('song.submit', {url:url});
			}
		});
		var controlerRegion = Marionate.Region.extend({});

		Views.ControlerView = Marionette.CompositeView.extend({
			template: "#controler-template",
			onRender: function () {
				this.volumeControl = this.$el.find('#volume_control');
			},
			initialize : function(){
				this.listenTo(MusicEngine.pubsub, 'player.volumeChange', this.onVolumeChanged);
			},
			onVolumeChanged:function(data){
				this.volumeControl.val(data.volume);
			},
		});
		/**
		 * Login
		 */
		var loginRegion = Marionate.Region.extend({});

		Views.LoginForm = Marionette.CompositeView.extend({
			template: "#login-template",
			events:{
				'submit #loginForm':'onSubmit'
			},

			onSubmit:function(e){
				e.preventDefault();
				var $target = $( e.currentTarget);

				var $userNameInput = $target.find('input[name="username"]');
				var username = $userNameInput.val();
				socket.emit('client.login', {username:username, room:MusicEngine.roomId});
			}

		});
		/**
		 * Message list
		 */
		var messageRegion = Marionate.Region.extend( {} );

		/**
		 * Playlist
		 */
		var playListRegion = Marionate.Region.extend( {} );

		/**
		 * Define the module
		 */
		var RoomModule = Marionette.Module.extend( {
			initialize: function ( options, moduleName, app ) {
				_.extend( this.options, options );

				this.songCollection = new Collections.Song();
				this.messageCollection = new Collections.Message();

				this.messageListView = new Views.MessageListView( {
					collection: this.messageCollection
				} );
				this.playListView = new Views.PlayList( {
					collection: this.songCollection
				} );
				this.loginView = new Views.LoginForm();
				this.songSubmitView = new Views.songSubmitView();
				this.controlerView = new Views.ControlerView();
				this.currentPlayingView = new Views.currentPlayingView();

				this.initViewEvent();
				this.initSocketEvent();
				this.initRegion();
			},
			initViewEvent: function () {
				this.listenTo(MusicEngine.pubsub, 'client.init.result', this.onInitResult);
				this.listenTo(MusicEngine.pubsub, 'client.login.result', this.onLoginResult);
				this.listenTo(MusicEngine.pubsub, 'song.submit.result', this.onSongSubmitResult);
				this.listenTo(MusicEngine.pubsub, 'client.disconnect', this.onDisconnect);
				this.listenTo(MusicEngine.pubsub, 'message.recive', this.onMessageRecived);
				this.listenTo(MusicEngine.pubsub, 'song.add', this.onSongAdded);
				this.listenTo(MusicEngine.pubsub, 'song.remove', this.onSongRemoved);
				this.listenTo(MusicEngine.pubsub, 'playlist.fetch.result', this.onPlaylistFetchResult);
			},
			initSocketEvent: function () {
				var self = this;
				socket.on( 'client.init.result', function ( data ) {
					MusicEngine.pubsub.trigger('client.init.result', data);
				} );

				socket.on( 'client.login.result', function ( data ) {
					MusicEngine.pubsub.trigger('client.login.result', data);
				} );

				socket.on( 'playlist.fetch.result', function ( data ) {
					MusicEngine.pubsub.trigger('playlist.fetch.result', data);
				} );

				socket.on( 'song.submit.result', function ( data ) {
					MusicEngine.pubsub.trigger('song.submit.result', data);
				} );
				socket.on( 'song.add', function ( data ) {
					MusicEngine.pubsub.trigger('song.add', data);
				} );
				socket.on( 'song.remove', function ( data ) {
					MusicEngine.pubsub.trigger('song.remove', data);
				} );
				socket.on( 'song.playing', function ( data ) {
					MusicEngine.pubsub.trigger('song.playing', data);
				} );
				socket.on( 'song.pause', function ( data ) {
					MusicEngine.pubsub.trigger('song.pause', data);
				} );
				socket.on( 'player.volumeChange', function ( data ) {
					MusicEngine.pubsub.trigger('player.volumeChange', data);
				} );
				socket.on( 'message.recive', function ( data ) {
					MusicEngine.pubsub.trigger('message.recive', data);
				} );
			},
			onDisconnect:function(){
				console.log('Your are disconnected');
				MusicEngine.playListRegion.empty();
				MusicEngine.mesasgeRegion.empty();
				MusicEngine.songSubmitRegion.empty();
				MusicEngine.controlerRegion.empty();
				MusicEngine.currentPlayingRegion.empty();
			},

			onPlaylistFetchResult:function(playlist){
				this.songCollection.reset(playlist);
			},
			onSongAdded:function(song){
				try{
					var newSong = new MusicEngine.Models.Song(song);
					this.songCollection.add(newSong);
				}
				catch(e){
					console.log( e.message);
				}
			},
			onSongRemoved:function(songId){
				try{
					this.songCollection.remove(songId);
				}
				catch(e){
					console.log( e.message);
				}
			},
			onSongSubmitResult:function(data){
				MusicEngine.pubsub.trigger('message.recive', data);
			},
			onMessageRecived:function(data){
				try{
					var newMessage = this.messageCollection.findWhere({id:data.id});
					if(newMessage)
					{
						/**
						 * This message is exist, update it
						 */
						newMessage.set(data);
					}
					else{
						newMessage = new Models.Message(data);
						this.messageCollection.add(newMessage);
					}
				}catch(e)
				{
					console.log(e);
				}
			},
			onLoginResult:function(data){
				if(data.success){
					MusicEngine.loginRegion.empty();
					MusicEngine.playListRegion.show(this.playListView);
					MusicEngine.mesasgeRegion.show(this.messageListView);
					MusicEngine.songSubmitRegion.show(this.songSubmitView);
					MusicEngine.controlerRegion.show(this.controlerView);
					MusicEngine.currentPlayingRegion.show(this.currentPlayingView);
				}
				else{
					alert('Login is not successed');
				}
			},
			onInitResult:function(data){
				if(data.isAllowed){
					/**
					 * Login success
					 */
					MusicEngine.loginRegion.show(this.loginView);
				}
				else
				{
					alert('You are not allowed : ' + data.msg);
				}
			},
			initRegion: function () {
				MusicEngine.addRegions( {
					playListRegion: {
						el: '#playListRegion',
						regionClass: playListRegion
					},
					mesasgeRegion: {
						el: '#messageRegion',
						regionClass: messageRegion
					},
					loginRegion: {
						el: '#loginRegion',
						regionClass: loginRegion
					},
					songSubmitRegion: {
						el: '#songSubmitRegion',
						regionClass: songSubmitRegion
					},
					controlerRegion: {
						el: '#controlerRegion',
						regionClass: controlerRegion
					},
					currentPlayingRegion: {
						el: '#currentPlayingRegion',
						regionClass: currentPlayingRegion
					}
				} );
			},
			onStart: function ( options ) {
				socket.emit('client.init', {room:MusicEngine.roomId, type:'member'});
			},
			onStop: function ( options ) {

			}
		} );
		/**
		 * Register the module with application
		 */
		MusicEngine.module( "RoomModule", RoomModule );
	}
)( jQuery, Backbone, Backbone.Marionette, socket, MusicEngine, MusicEngine.Views, MusicEngine.Models, MusicEngine.Collections );
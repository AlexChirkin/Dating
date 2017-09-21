// Module Dependencies and Setup

var express = require('express')
  , mongoose = require('mongoose')
  , UserModel = require('./models/user')
  , ConversationModel = require('./models/conversation')
  , User = mongoose.model('User')
  , welcome = require('./controllers/welcome')
  , users = require('./controllers/users')
  , ChatController = require('./controllers/chat')
  , http = require('http')
  , path = require('path')
  , engine = require('ejs-locals')
  , flash = require('connect-flash')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , expressValidator = require('express-validator')
  , mailer = require('express-mailer')
  , passportSocketIo = require("passport.socketio")
  , config = require('./config')
  , chatRoutes = express.Router()
  , app = express();

var bodyParser = require('body-parser');
var methodOverride = require('method-override');

app.engine('ejs', engine);
app.set('port', process.env.PORT || 3019);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(expressValidator);
app.use(express.methodOverride());

app.use(express.cookieParser('secret'));

app.use(express.cookieSession({
    secret: process.env.COOKIE_SECRET || "VGhlIEdyYWR1YXRl"
    })
);

app.use(express.session({
    secret: 'secret',
    key:'app.sid',
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// Helpers

app.use(function(req, res, next){
  res.locals.userIsAuthenticated = req.isAuthenticated(); // check for user authentication
  res.locals.user = req.user; // make user available in all views
  res.locals.errorMessages = req.flash('error'); // make error alert messages available in all views
  res.locals.successMessages = req.flash('success'); // make success messages available in all views
  app.locals.layoutPath = "../shared/layout";
  next();
});

// Mailer Setup

mailer.extend(app, {
  from: 'ihoooly@gmail.com',
  host: 'smtp.gmail.com', // hostname
   secureConnection: false, // use SSL
  port: 587, // port for Mandrill
  transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
  auth: {
    user: 'asd',
    pass: 'asd'
  }
});

// Routing Initializers

app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

// Error Handling

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
} else {
  app.use(function(err, req, res, next) {
    res.render('errors/500', { status: 500 });
  });
}

// Database Connection

if ('development' == app.get('env')) {
  mongoose.connect('mongodb://localhost/nodedemo6');
} else {
  // insert db connection for production
}

// Authentication

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) return done(err);
      if (!user) return done(null, false, { message: "Sorry, we don't recognize that username." });
      user.validPassword(password, function(err, isMatch){
        if(err) return done(err);
        if(isMatch) return done(null, user);
        else done(null, false, { message: 'Incorrect password.' });
      });
    });
  }
));

function ensureAuthenticated(req, res, next){
  if (req.isAuthenticated()) return next();
  req.flash('error', 'Please sign in to continue.');
  var postAuthDestination = req.url;
  res.redirect('/login?postAuthDestination='+postAuthDestination);
}

function redirectAuthenticated(req, res, next){
  if (req.isAuthenticated()) return res.redirect('/');
  next();
}


// chat

//socketEvents = require('./socketEvents');
var server = app.listen(8810);
var io = require('socket.io').listen(server);

io.on('connection', (socket) => {
  console.log('a user connected');

  // On conversation entry, join broadcast channel
  socket.on('enter conversation', (conversation) => {
    socket.join(conversation);
    console.log('joined ' + conversation);
  });

  socket.on('leave conversation', (conversation) => {
    socket.leave(conversation);
    console.log('left ' + conversation);
  })

  socket.on('new message', (data) => {
    // io.sockets.in(conversation).emit('refresh messages', conversation);
    console.log('message:' + data.message + ', id ' + data.id);
    io.emit('chat message', { msg: data.message, id: data.id, user: data.user});
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


// Routing

app.get('/', welcome.index);
app.get('/login', redirectAuthenticated, users.login);
app.get('/reset_password', redirectAuthenticated, users.reset_password);
app.post('/reset_password', redirectAuthenticated, users.generate_password_reset);
app.get('/password_reset', redirectAuthenticated, users.password_reset);
app.post('/password_reset', redirectAuthenticated, users.process_password_reset);
app.post('/login', redirectAuthenticated, users.authenticate);
app.get('/register', redirectAuthenticated, users.register);
app.post('/register', redirectAuthenticated, users.userValidations, users.create);
app.get('/account', ensureAuthenticated, users.account);
app.post('/account', ensureAuthenticated, users.userValidations, users.update);
app.get('/dashboard', ensureAuthenticated, users.dashboard);
app.get('/logout', users.logout);
app.get('/users', ensureAuthenticated, users.list);// for illustrative purposes only
app.post('/users', ensureAuthenticated, users.profile);
app.get('/converstation', ensureAuthenticated, users.converstation);


app.get('/profile', ensureAuthenticated, users.profile);
//app.all('*', welcome.not_found);



// Set chat routes as a subgroup/middleware to apiRoutes
//app.use('/chat', chatRoutes);


// View messages to and from authenticated user
app.get('/chat', ensureAuthenticated, ChatController.getConversations);

// Retrieve single conversation
app.get('/chat/:conversationId', ensureAuthenticated, ChatController.getConversation);

// Send reply in conversation
app.post('/reply', ensureAuthenticated, ChatController.sendReply);

// Start new conversation
app.post('/new', ensureAuthenticated, ChatController.newConversation);



//app.get('/list', ensureAuthenticated, users.list());
//app.post('/search', ensureAuthenticated, users.userValidations, users.update);



// Start Server w/ DB Connection

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });
});

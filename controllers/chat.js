"use strict"
const Conversation = require('../models/conversation'),
      Message = require('../models/message'),
      User = require('../models/user');


exports.getConversations = function(req, res, next) {
  // Only return one message from each conversation to display as snippet
  Conversation.find({ participants: req.user._id })
    .select('_id')
    .exec(function(err, conversations) {
      if (err) {
        res.send({ error: err });
        return next(err);
      }

      // Set up empty array to hold conversations + most recent message
      let fullConversations = [];
      conversations.forEach(function(conversation) {
        Message.find({ 'conversationId': conversation._id })
          .sort('-createdAt')
          .limit(1)
          .populate({
            path: "author",
            select: "firstName lastName"
          })
          .exec(function(err, message) {
            if (err) {
              res.send({ error: err });
              return next(err);
            }
            fullConversations.push(message);
            if(fullConversations.length === conversations.length) {
              // return res.status(200).json({ conversations: fullConversations });
              return res.render('users/conversations',{  conversations:fullConversations });
            }
          });
      });
  });
}

exports.getConversation = function(req, res, next) {
    //console.log('ID:', req.params.conversationId);
  Message.find({ conversationId: req.params.conversationId })

    .select('createdAt body author')
    .sort('-createdAt')
    .populate({
      path: 'author',
      select: 'firstName lastName'
    })
    .exec(function(err, messages) {
      if (err) {
        res.send({ error: err });
        return next(err);
      }

      // res.status(200).json({ conversation: messages });
      res.render('users/conversation',{  conversation: messages });
    });
  }

exports.newConversation = function(req, res, next) {
  console.log('new conversation');
  if(!req.body.recipient) {
    res.status(422).send({ error: 'Please choose a valid recipient for your message.' });
    return next();
  }

  if(!req.body.composedMessage) {
    res.status(422).send({ error: 'Please enter a message.' });
    return next();
  }

  const conversation = new Conversation({
    participants: [req.user._id, req.body.recipient]
  });

  conversation.save(function(err, newConversation) {
    if (err) {
      res.send({ error: err });
      return next(err);
    }

    const message = new Message({
      conversationId: newConversation._id,
      body: req.body.composedMessage,
      author: req.user._id
    });

    message.save(function(err, newMessage) {
      if (err) {
        res.send({ error: err });
        return next(err);
      }

      // res.status(200).json({ message: 'Conversation started!', conversationId: conversation._id });
      res.redirect('/chat/' + conversation._id);
      return next();
    });
  });
}

exports.sendReply = function(req, res, next) {
  const reply = new Message({
    conversationId: req.body.conversationId,
    body: req.body.composedMessage,
    author: req.user._id
  });

  reply.save(function(err, sentReply) {
    if (err) {
      res.send({ error: err });
      return next(err);
    }

    res.status(200).json({ message: 'Reply successfully sent!' });
    return(next);
  });
}

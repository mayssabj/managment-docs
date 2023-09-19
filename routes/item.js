const express = require('express');
const router = express.Router();
const multer = require('multer');
const Item = require('../models/item');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const mongoose = require('mongoose');
const { title } = require('process');
const fs = require('fs');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const { JsonWebTokenError } = require('jsonwebtoken');
const { token } = require('morgan');



// Configuration
cloudinary.config({
  cloud_name: "drdvbbr1d",
  api_key: "848374464672151",
  api_secret: "4Vxmnt7bITpi-trjT2HOT_Ju_0E"
});

// Configure Multer to handle file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Read data
router.get('/items', (req, res) => {
  Item.find({})
    .then(items => {
      res.json(items);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: 'Error reading items' });
    });
});

router.get('/listitems', (req, res) => {
  // Utilisez try/catch pour gérer les erreurs de décodage du jeton
  try {
    const email = jwt.decode(req.cookies.session).email;
    User.findOne({ email: email })
      .then(user => {
        if (!user) {
          return res.status(404).json({ error: 'Profile not found' });
        }
        Item.find({ email: email }) // Filtrer les articles appartenant à l'utilisateur
          .then(items => {
            res.json(items);
          })
          .catch(err => {
            console.log(err);
            res.status(500).json({ error: 'Error reading items' });
          });
      })
      .catch(err => {
        console.log(err);
        res.status(500).json({ error: 'Error reading profile' });
      });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: 'Invalid session token' });
  }

});
const notifier = require('node-notifier');
// Initialize the notification count to 0
let notificationCount = 0;

// Handle POST requests to upload a file
router.post('/', upload.single('file'), function(req, res) {
  // Get the path to the uploaded file
  const filePath = req.file.path;

  // Upload the file to Cloudinary
  cloudinary.uploader.upload(filePath, function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    console.log(result);

    // Create a new item with the uploaded file URL
    const newItem = new Item({
      title: req.body.title,
      file: filePath,
      service: req.body.service,
    });

    // Save the new item to the database
    newItem.save()
      .then(() => {
        // Increment the notification count and display it
        notificationCount++;
        console.log(`New Item Posted - Notification Count: ${notificationCount}`);
        // Send notification
        notifier.notify({
          title: 'New File Posted',
          message: 'Your file has been upload successfully!'
        });

        res.redirect('/dashboard-listing.html');
      })
      .catch((error) => {
        console.log(error);
        
      });
  });
});


// Handle PUT requests to update an item
router.post('/items/:id', upload.single('file'), (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  // Find the item by ID
  Item.findById(id)
    .then(item => {
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Update the item with the new data
     
      item.title = req.body.title;
      
      item.service = req.body.service;


      // Upload the new file to Cloudinary if provided
      if (req.file) {
        const filePath = req.file.path;
        cloudinary.uploader.upload(filePath, function(err, result) {
          if (err) {
            console.log(err);
            return res.status(500).send(err);
          }
          console.log(result);
          item.file = filePath;
          // Save the updated item to the database
          item.save()
            .then(() => {
              res.redirect('/dashboard-listing.html');
            })
            .catch((error) => {
              console.log(error);
              // handle error
            });
        });
      } else {
        // Save the updated item to the database
        item.save()
          .then(() => {
            res.redirect('/dashboard-listing.html');
          })
          .catch((error) => {
            console.log(error);
            // handle error
          });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: 'Error updating item' });
    });
});





// Handle DELETE requests to delete an item
router.post('/delete/:id', (req, res) => {
  
  
  const itemId = req.params.id;

  Item.findByIdAndDelete(itemId)
    .then(() => {
      res.redirect('back');
      
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: 'Error deleting item' });
    });
});

router.get('/items/:id', (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  Item.findOne({ _id: id })
    .then(item => {
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: 'Error reading item' });
    });
});

router.get('/item/:service', (req, res) => {
  const service = req.params.service;
  Item.find({ service: service })
    .then(items => {
      if (items.length === 0) {
        return res.status(404).redirect("../error-page.html");
      }
      res.render('../list-category.html',{ items });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: 'Error reading items' });
    });
});




// ...

router.get('/open/file/:id', (req, res) => {
  const id = req.params.id;

  // You need to retrieve the file path from your database or filesystem based on the item's ID.
  // Make sure the item with the specified ID has a 'file' field that stores the file path.

  Item.findById(id)
    .then(item => {
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Get the file path from the item
      const filePath = item.file;
      console.log('File Path:', filePath);

      // Check if the file exists
      if (fs.existsSync(filePath)) {
        console.log('File exists:', filePath);

        // Get the absolute path
        const absolutePath = path.resolve(filePath);

        // Send the file as a response with the absolute path
        res.sendFile(absolutePath);
      } else {
        console.log('File does not exist:', filePath);
        res.status(404).json({ error: 'File not found' });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: 'Error opening file' });
    });
});












router.get('/search/file', async (req, res) => {
  const service = req.query.service || 'All services';
  const title = req.query.title || '';
  

  // Check if any of the search parameters are empty
  if (service === '' || title === '' ) {
    // Redirect the user back to the error page with an error message
    const errorMessage = 'Please enter a value for all search fields.';
    res.redirect(`/error-page.html?error=${errorMessage}`);
    return;
  }

  try {
    const query = req.query.q ? req.query.q.toString() : '';
    const items = await Item.find({ 
      $and: [
        { title: { $regex: title, $options: "i" } },
      
        { service: { $regex: service, $options: "i" } }
      ],
      type: "lost"
    });
    // Pass search parameters to the redirect URL
    
    res.render('../listing-layout-3.html',{items});
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});




router.get('/search', async (req, res) => {
  const service = req.query.service || 'All services';
  const title = req.query.title || '';
  

  // Check if any of the search parameters are empty
  if (service === '' || title === '' ) {
    // Redirect the user back to the error page with an error message
    const errorMessage = 'Please enter a value for all search fields.';
    res.redirect(`/error-page.html?error=${errorMessage}`);
    return;
  }

  try {
    const query = req.query.q ? req.query.q.toString() : '';
    const items = await Item.find({ 
      $and: [
        { title: { $regex: title, $options: "i" } },
       
        { service: { $regex: service, $options: "i" } } , 
       
      ],
      
    });
    // Pass search parameters to the redirect URL
    
    res.render('../listing-layout-3.html',{items});
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



module.exports = router;

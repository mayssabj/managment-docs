const mongoose = require('mongoose');
const ItemSchema = {
    title: {
      type: String,
      required: true,
    },
    service: {
      type: String,
      required: true,
      
    },
   
    file: {
      type: String,
      required:true,
    },
    
  
  }
  const Item = mongoose.model('Item', ItemSchema);
  
  module.exports = Item;
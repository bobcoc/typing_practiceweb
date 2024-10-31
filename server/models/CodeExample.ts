import mongoose from 'mongoose';

const CodeExampleSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  code: { type: String, required: true }
});

const CodeExample = mongoose.model('CodeExample', CodeExampleSchema);

export default CodeExample; 
import mongoose from 'mongoose';

const studyMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    subjectName: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [80, 'Subject name cannot exceed 80 characters'],
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Exam Paper', 'Note', 'Book'],
        message: 'Category must be one of: Exam Paper, Note, Book',
      },
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileType: {
      type: String,
      enum: ['pdf', 'image'],
      default: 'pdf',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    college: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index for fast filtered queries
studyMaterialSchema.index({ college: 1, semester: 1, category: 1 });
studyMaterialSchema.index({ college: 1, subjectName: 'text', title: 'text' });

export default mongoose.model('StudyMaterial', studyMaterialSchema);

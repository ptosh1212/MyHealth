'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { addDoc, collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { useAlertStore } from '@/lib/alert-store';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSuccess: () => void;
}

export default function RatingModal({ isOpen, onClose, appointment, onSuccess }: RatingModalProps) {
  const { user } = useAuthStore();
  const { showAlert } = useAlertStore();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      showAlert('Rating Required', 'Please select at least one star to rate your clinical experience.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // Check if already rated this appointment
      const existingQuery = query(
        collection(db, 'ratings'),
        where('userId', '==', user?.uid),
        where('appointmentId', '==', appointment.id)
      );
      const existingSnap = await getDocs(existingQuery);
      
      if (!existingSnap.empty) {
        showAlert('Duplicate Rating', 'You have already provided feedback for this specific appointment.', 'info');
        setSubmitting(false);
        return;
      }

      // Add rating
      await addDoc(collection(db, 'ratings'), {
        userId: user?.uid,
        userName: user?.email?.split('@')[0] || 'Anonymous',
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        appointmentId: appointment.id,
        rating: rating,
        comment: comment.trim(),
        createdAt: Timestamp.now(),
      });

      onSuccess();
      onClose();
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error submitting rating:', error);
      showAlert('Submission Error', 'We failed to save your rating. Please try again or contact support.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={ onClose} />
        <div className="relative w-full sm:max-w-md max-h-[95vh] overflow-y-auto bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl p-6 md:p-8 animate-slide-up pb-12 sm:pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Rate Your Experience</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
            <X size={24} className="text-slate-900" />
          </button>
        </div>

        {/* Doctor Info */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {appointment.doctorName?.charAt(0) || 'D'}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Dr. {appointment.doctorName}</h3>
            <p className="text-sm text-slate-500">{appointment.doctorSpecialty}</p>
          </div>
        </div>

        {/* Star Rating */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-900 mb-3">How was your experience?</p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={40}
                  className={`${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-600'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center mt-3 text-primary font-semibold">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Share your feedback (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary transition min-h-[100px] resize-none"
            placeholder="Tell us about your experience..."
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">{comment.length}/500</p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full bg-primary text-slate-900 px-6 py-4 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      </div>
    </div>
  );
}
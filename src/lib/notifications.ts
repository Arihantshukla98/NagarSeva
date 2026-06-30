import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export async function createNotification(
  userId: string,
  issueId: string,
  issueTitle: string,
  message: string,
  type: 'status_change' | 'voted_resolved',
  oldStatus?: string,
  newStatus?: string
) {
  // Guard against invalid or default anonymous IDs
  if (!userId || userId === 'anonymous' || userId.startsWith('anon-') || userId.startsWith('citizen.')) {
    return;
  }

  const notifRef = doc(collection(db, 'notifications'));
  try {
    await setDoc(notifRef, {
      id: notifRef.id,
      userId,
      issueId,
      issueTitle,
      message,
      type,
      oldStatus,
      newStatus,
      createdAt: new Date().toISOString(),
      read: false
    });
  } catch (err) {
    console.error('Error creating notification in Firestore:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, `notifications/${notifRef.id}`);
    } catch (e) {
      // Don't crash parent flows, but ensure standard handling takes place
    }
  }
}

export async function notifyAllUsersAboutNewReport(
  issueId: string,
  issueTitle: string,
  reportedByName: string
) {
  try {
    const userIdsSet = new Set<string>();
    
    // Always include the BBMP District Officer and Demo Citizen so they are notified in real-time
    userIdsSet.add('demo-authority-123'); // Officer Patel (BBMP) - BBMP District Officer Gate
    userIdsSet.add('demo-user-123');      // Karan Malhotra (Demo Citizen)
    
    // Fetch all registered users from Firestore to notify them too
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.forEach((userDoc) => {
        if (userDoc.id && userDoc.id !== 'anonymous') {
          userIdsSet.add(userDoc.id);
        }
      });
    } catch (dbErr) {
      console.warn('Could not read users list from Firestore, falling back to demo users:', dbErr);
    }
    
    const message = `📢 New report filed by ${reportedByName}: "${issueTitle}"`;
    
    // Create notifications for all these users in parallel
    const promises = Array.from(userIdsSet).map(async (userId) => {
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId,
        issueId,
        issueTitle,
        message,
        type: 'status_change',
        oldStatus: 'none',
        newStatus: 'reported',
        createdAt: new Date().toISOString(),
        read: false
      });
    });
    
    await Promise.all(promises);
    console.log(`Successfully sent new report notification to ${userIdsSet.size} users.`);
  } catch (err) {
    console.error('Error sending global notifications for new report:', err);
  }
}

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface OracleLogOptions {
  startDate?: string;
  endDate?: string;
  type?: string;
  limit?: number;
}

class FirebaseService {
  async saveOracle(userId: string, oracleData: any) {
    try {
      const oracleRef = doc(db, 'oracles', oracleData.id);
      await setDoc(oracleRef, {
        ...oracleData,
        userId,
        updatedAt: Timestamp.now(),
        createdAt: oracleData.createdAt || Timestamp.now(),
      });
      return oracleData.id;
    } catch (error) {
      console.error('Error saving oracle:', error);
      throw error;
    }
  }

  async getOracle(oracleId: string) {
    try {
      const oracleRef = doc(db, 'oracles', oracleId);
      const oracleSnap = await getDoc(oracleRef);
      
      if (oracleSnap.exists()) {
        return { id: oracleSnap.id, ...oracleSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting oracle:', error);
      throw error;
    }
  }

  async getUserOracles(userId: string) {
    try {
      const oraclesRef = collection(db, 'oracles');
      const q = query(
        oraclesRef, 
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user oracles:', error);
      throw error;
    }
  }

  async updateOracle(oracleId: string, updates: any) {
    try {
      const oracleRef = doc(db, 'oracles', oracleId);
      await updateDoc(oracleRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating oracle:', error);
      throw error;
    }
  }

  async deleteOracle(oracleId: string) {
    try {
      const oracleRef = doc(db, 'oracles', oracleId);
      await deleteDoc(oracleRef);
      
      const logsRef = collection(db, 'oracles', oracleId, 'logs');
      const logsSnapshot = await getDocs(logsRef);
      
      const deletePromises = logsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting oracle:', error);
      throw error;
    }
  }

  async addOracleLog(oracleId: string, logData: any) {
    try {
      const logsRef = collection(db, 'oracles', oracleId, 'logs');
      const docRef = await addDoc(logsRef, {
        ...logData,
        createdAt: Timestamp.now(),
        timestamp: logData.timestamp || new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding oracle log:', error);
      throw error;
    }
  }

  async getOracleLogs(oracleId: string, options: OracleLogOptions = {}) {
    try {
      const logsRef = collection(db, 'oracles', oracleId, 'logs');
      let q = query(logsRef, orderBy('createdAt', 'desc'));
      
      if (options.startDate) {
        q = query(q, where('timestamp', '>=', options.startDate));
      }
      if (options.endDate) {
        q = query(q, where('timestamp', '<=', options.endDate));
      }
      
      if (options.type) {
        q = query(q, where('type', '==', options.type));
      }
      
      if (options.limit) {
        q = query(q, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting oracle logs:', error);
      throw error;
    }
  }

  async deleteOracleLog(oracleId: string, logId: string) {
    try {
      const logRef = doc(db, 'oracles', oracleId, 'logs', logId);
      await deleteDoc(logRef);
    } catch (error) {
      console.error('Error deleting oracle log:', error);
      throw error;
    }
  }

  async clearOracleLogs(oracleId: string, options: OracleLogOptions = {}) {
    try {
      const logs = await this.getOracleLogs(oracleId, options);
      const deletePromises = logs.map(log => 
        this.deleteOracleLog(oracleId, log.id)
      );
      await Promise.all(deletePromises);
      return logs.length;
    } catch (error) {
      console.error('Error clearing oracle logs:', error);
      throw error;
    }
  }

  async saveConversationHistory(oracleId: string, history: any[]) {
    try {
      const oracleRef = doc(db, 'oracles', oracleId);
      await updateDoc(oracleRef, {
        conversationHistory: history,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error saving conversation history:', error);
      throw error;
    }
  }
}

export default new FirebaseService();

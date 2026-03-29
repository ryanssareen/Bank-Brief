import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './config';

export async function getDocument(path: string) {
  const snap = await getDoc(doc(db, path));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getCollection(
  path: string,
  constraints: { field: string; op: '==' | '>' | '<'; value: unknown }[] = [],
  order?: { field: string; direction: 'asc' | 'desc' }
) {
  const ref = collection(db, path);
  const queryConstraints = [
    ...constraints.map((c) => where(c.field, c.op, c.value)),
    ...(order ? [orderBy(order.field, order.direction)] : []),
  ];
  const snap = await getDocs(query(ref, ...queryConstraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createDocument(
  path: string,
  data: DocumentData
) {
  const ref = await addDoc(collection(db, path), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(
  path: string,
  data: DocumentData
) {
  await updateDoc(doc(db, path), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(path: string) {
  await deleteDoc(doc(db, path));
}

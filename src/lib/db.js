import fs from 'fs';
import path from 'path';
import { list, put } from '@vercel/blob';
import { createClient } from '@supabase/supabase-js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Check if running on Vercel/production and we have Vercel Blob credentials
const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const rawToken = process.env.DB_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_DB || process.env.BLOB_READ_WRITE_TOKEN || '';
const blobToken = rawToken.replace(/^["']|["']$/g, '').trim();
const hasBlobToken = !!blobToken;
const useRemoteBlob = isServerless && hasBlobToken;

// Supabase Configuration
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/^["']|["']$/g, '').trim();
// Use service role key if available for serverless bypassing of RLS, else fallback to anon key
const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
).replace(/^["']|["']$/g, '').trim();

const useSupabase = !!(supabaseUrl && supabaseKey);
let supabase = null;

if (useSupabase) {
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false
        }
    });
    console.log('[DB] Supabase database client initialized successfully.');
} else {
    console.log('[DB] Supabase credentials not found. Falling back to Vercel Blob/local storage.');
}

// Database schema translation helpers
function mapToDb(data) {
    return {
        registration_id: data.registrationId || data.id,
        name: data.name || data.fullName || '',
        instagram_username: data.instagramUsername || '',
        date_of_birth: data.dateOfBirth || data.dob || '',
        email: data.email || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        height: data.height || '',
        state: data.state || '',
        city: data.city || '',
        pincode: data.pincode || '',
        full_length_photo: data.fullLengthPhoto || '',
        close_up_photo: data.closeUpPhoto || '',
        payment_status: data.paymentStatus || 'PENDING',
        payment_amount: Number(data.paymentAmount || 0),
        razorpay_order_id: data.razorpayOrderId || '',
        razorpay_payment_id: data.razorpayPaymentId || '',
        razorpay_signature: data.razorpaySignature || '',
        payment_date: data.paymentDate || '',
        created_at: data.createdAt || new Date().toISOString(),
        updated_at: data.updatedAt || new Date().toISOString(),
        application_status: data.applicationStatus || 'Payment Pending',
        message: data.message || '',
        course: data.course || '',
        service: data.service || '',
        address: data.address || '',
        type: data.type || 'registration'
    };
}

function mapFromDb(row) {
    if (!row) return null;
    return {
        registrationId: row.registration_id,
        id: row.registration_id, // Alias for backward compatibility
        name: row.name,
        fullName: row.name, // Alias for backward compatibility
        instagramUsername: row.instagram_username,
        dateOfBirth: row.date_of_birth,
        dob: row.date_of_birth, // Alias for backward compatibility
        email: row.email,
        phone: row.phone,
        whatsapp: row.whatsapp,
        height: row.height,
        state: row.state,
        city: row.city,
        pincode: row.pincode,
        fullLengthPhoto: row.full_length_photo,
        closeUpPhoto: row.close_up_photo,
        paymentStatus: row.payment_status,
        paymentAmount: Number(row.payment_amount || 0),
        razorpayOrderId: row.razorpay_order_id,
        razorpayPaymentId: row.razorpay_payment_id,
        razorpaySignature: row.razorpay_signature,
        paymentDate: row.payment_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        applicationStatus: row.application_status,
        message: row.message,
        course: row.course,
        service: row.service,
        address: row.address,
        type: row.type
    };
}

// Ensure database directory and file exist locally (development fallback)
function initializeLocalDB() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ registrations: [] }, null, 2), 'utf-8');
    }
}

export async function getRegistrations() {
    if (useSupabase) {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('*');
            if (error) throw error;
            return (data || []).map(mapFromDb);
        } catch (error) {
            console.error('Error fetching registrations from Supabase, falling back to Vercel/Local:', error);
        }
    }

    if (useRemoteBlob) {
        try {
            const { blobs } = await list({
                prefix: 'db.json',
                token: blobToken
            });
            const dbBlob = blobs.find(b => b.pathname === 'db.json');
            if (!dbBlob) {
                return [];
            }
            const res = await fetch(`${dbBlob.url}?t=${Date.now()}`, {
                headers: {
                    Authorization: `Bearer ${blobToken}`
                },
                cache: 'no-store',
                next: { revalidate: 0 }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch database file: ${res.statusText}`);
            }
            const data = await res.json();
            return data.registrations || [];
        } catch (error) {
            console.error('Error reading registration DB from Vercel Blob:', error);
            try {
                initializeLocalDB();
                const data = fs.readFileSync(DB_FILE, 'utf-8');
                return JSON.parse(data).registrations || [];
            } catch (fsErr) {
                return [];
            }
        }
    } else {
        try {
            initializeLocalDB();
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            return JSON.parse(data).registrations || [];
        } catch (error) {
            console.error('Error reading registration DB locally:', error);
            return [];
        }
    }
}

export async function saveRegistrations(registrations) {
    // If Supabase is active, individual mutations are preferred.
    // However, if we need bulk writes, we query updates inline.
    if (useSupabase) {
        try {
            const rows = registrations.map(mapToDb);
            const { error } = await supabase
                .from('registrations')
                .upsert(rows);
            if (error) throw error;
            console.log('[DB] Save successful: true (Supabase Upsert)');
            return true;
        } catch (error) {
            console.error('Error bulk upserting to Supabase:', error);
        }
    }

    if (useRemoteBlob) {
        try {
            await put('db.json', JSON.stringify({ registrations }, null, 2), {
                access: 'private',
                addRandomSuffix: false,
                token: blobToken
            });
            console.log('[DB] Save successful: true (Vercel Blob)');
            return true;
        } catch (error) {
            console.error('Error writing registration DB to Vercel Blob:', error);
            try {
                initializeLocalDB();
                fs.writeFileSync(DB_FILE, JSON.stringify({ registrations }, null, 2), 'utf-8');
                console.log('[DB] Save successful: true (Local Fallback)');
                return true;
            } catch (fsErr) {
                console.log('[DB] Save successful: false');
                return false;
            }
        }
    } else {
        try {
            initializeLocalDB();
            fs.writeFileSync(DB_FILE, JSON.stringify({ registrations }, null, 2), 'utf-8');
            console.log('[DB] Save successful: true (Local)');
            return true;
        } catch (error) {
            console.error('Error writing to registration DB locally:', error);
            console.log('[DB] Save successful: false');
            return false;
        }
    }
}

export async function addRegistration(data) {
    const registrationId = data.registrationId || data.id || `NINTM-${Math.floor(100000 + Math.random() * 900000)}`;
    console.log('[DB] Generated registration ID:', registrationId);

    const newRegistration = {
        registrationId,
        id: registrationId,
        name: data.name || data.fullName || '',
        fullName: data.name || data.fullName || '',
        instagramUsername: data.instagramUsername || '',
        dateOfBirth: data.dateOfBirth || data.dob || '',
        dob: data.dateOfBirth || data.dob || '',
        email: data.email || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        height: data.height || '',
        state: data.state || '',
        city: data.city || '',
        pincode: data.pincode || '',
        fullLengthPhoto: data.fullLengthPhoto || '',
        closeUpPhoto: data.closeUpPhoto || '',
        paymentStatus: data.paymentStatus || 'PENDING',
        paymentAmount: Number(data.paymentAmount || 0),
        razorpayOrderId: data.razorpayOrderId || '',
        razorpayPaymentId: data.razorpayPaymentId || '',
        razorpaySignature: data.razorpaySignature || '',
        paymentDate: data.paymentDate || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        applicationStatus: data.applicationStatus || 'Payment Pending',
        message: data.message || '',
        course: data.course || '',
        service: data.service || '',
        address: data.address || '',
        type: data.type || 'registration'
    };

    if (useSupabase) {
        try {
            const dbData = mapToDb(newRegistration);
            const { error } = await supabase
                .from('registrations')
                .insert([dbData]);
            if (error) throw error;
            console.log('[DB] Save successful: true (Supabase Insert)');
            return newRegistration;
        } catch (error) {
            console.error('Error inserting row in Supabase, falling back to JSON storage:', error);
        }
    }

    const registrations = await getRegistrations();
    registrations.push(newRegistration);
    await saveRegistrations(registrations);
    return newRegistration;
}

export async function updateRegistration(id, updates) {
    if (useSupabase) {
        try {
            const { data: existing, error: findError } = await supabase
                .from('registrations')
                .select('*')
                .eq('registration_id', id);

            if (findError) throw findError;

            if (existing && existing.length > 0) {
                const dbUpdates = {};
                if (updates.name !== undefined) dbUpdates.name = updates.name;
                if (updates.fullName !== undefined) dbUpdates.name = updates.fullName;
                if (updates.instagramUsername !== undefined) dbUpdates.instagram_username = updates.instagramUsername;
                if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
                if (updates.dob !== undefined) dbUpdates.date_of_birth = updates.dob;
                if (updates.email !== undefined) dbUpdates.email = updates.email;
                if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
                if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
                if (updates.height !== undefined) dbUpdates.height = updates.height;
                if (updates.state !== undefined) dbUpdates.state = updates.state;
                if (updates.city !== undefined) dbUpdates.city = updates.city;
                if (updates.pincode !== undefined) dbUpdates.pincode = updates.pincode;
                if (updates.fullLengthPhoto !== undefined) dbUpdates.full_length_photo = updates.fullLengthPhoto;
                if (updates.closeUpPhoto !== undefined) dbUpdates.close_up_photo = updates.closeUpPhoto;
                if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
                if (updates.paymentAmount !== undefined) dbUpdates.payment_amount = Number(updates.paymentAmount || 0);
                if (updates.razorpayOrderId !== undefined) dbUpdates.razorpay_order_id = updates.razorpayOrderId;
                if (updates.razorpayPaymentId !== undefined) dbUpdates.razorpay_payment_id = updates.razorpayPaymentId;
                if (updates.razorpaySignature !== undefined) dbUpdates.razorpay_signature = updates.razorpaySignature;
                if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
                if (updates.applicationStatus !== undefined) dbUpdates.application_status = updates.applicationStatus;
                if (updates.message !== undefined) dbUpdates.message = updates.message;
                if (updates.course !== undefined) dbUpdates.course = updates.course;
                if (updates.service !== undefined) dbUpdates.service = updates.service;
                if (updates.address !== undefined) dbUpdates.address = updates.address;
                if (updates.type !== undefined) dbUpdates.type = updates.type;

                dbUpdates.updated_at = new Date().toISOString();

                const { data: updated, error: updateError } = await supabase
                    .from('registrations')
                    .update(dbUpdates)
                    .eq('registration_id', id)
                    .select();

                if (updateError) throw updateError;
                console.log('[DB] Update successful: true (Supabase Update)');
                return mapFromDb(updated[0]);
            }
        } catch (error) {
            console.error('Error updating row in Supabase, falling back to JSON storage:', error);
        }
    }

    const registrations = await getRegistrations();
    const index = registrations.findIndex(r => r.id === id || r.registrationId === id);
    if (index !== -1) {
        registrations[index] = {
            ...registrations[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        if (updates.registrationId) registrations[index].id = updates.registrationId;
        if (updates.name) registrations[index].fullName = updates.name;
        if (updates.dateOfBirth) registrations[index].dob = updates.dateOfBirth;

        await saveRegistrations(registrations);
        return registrations[index];
    }
    return null;
}

export async function updateRegistrationStatus(id, paymentStatus, applicationStatus, paymentDetails = null) {
    const updates = {};
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (applicationStatus) updates.applicationStatus = applicationStatus;
    if (paymentDetails) {
        updates.razorpayPaymentId = paymentDetails.paymentId || '';
        updates.razorpayOrderId = paymentDetails.orderId || '';
        updates.razorpaySignature = paymentDetails.signature || '';
        updates.paymentDate = paymentDetails.date || new Date().toISOString();
        if (paymentDetails.amount) updates.paymentAmount = paymentDetails.amount;
    }
    return await updateRegistration(id, updates);
}

import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/^["']|["']$/g, '').trim();
const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
).replace(/^["']|["']$/g, '').trim();

if (!supabaseUrl || !supabaseKey) {
    console.error('[DB] Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

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
        type: data.type || 'registration',
        admin_notes: data.adminNotes || data.admin_notes || ''
    };
}

function mapFromDb(row) {
    if (!row) return null;
    return {
        registrationId: row.registration_id,
        id: row.registration_id,
        name: row.name,
        fullName: row.name,
        instagramUsername: row.instagram_username,
        dateOfBirth: row.date_of_birth,
        dob: row.date_of_birth,
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
        type: row.type,
        adminNotes: row.admin_notes || ''
    };
}

export async function getRegistrations() {
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapFromDb);
    } catch (error) {
        console.error('[DB] Error fetching registrations from Supabase:', error);
        return [];
    }
}

export async function getRegistrationById(id) {
    if (!id) return null;
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select('*')
            .eq('registration_id', id)
            .maybeSingle();

        if (error) throw error;
        return mapFromDb(data);
    } catch (error) {
        console.error('[DB] Error fetching registration by ID:', error);
        return null;
    }
}

export async function addRegistration(data) {
    const registrationId = data.registrationId || data.id || `NINTM-${Math.floor(100000 + Math.random() * 900000)}`;

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
        type: data.type || 'registration',
        adminNotes: data.adminNotes || data.admin_notes || ''
    };

    try {
        const dbData = mapToDb(newRegistration);
        const { error } = await supabase
            .from('registrations')
            .insert([dbData]);

        if (error) throw error;
        console.log('[DB] Registration added successfully in Supabase:', registrationId);
        return newRegistration;
    } catch (error) {
        console.error('[DB] Error inserting row in Supabase:', error);
        throw error;
    }
}

export async function updateRegistration(id, updates) {
    try {
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
        if (updates.adminNotes !== undefined) dbUpdates.admin_notes = updates.adminNotes;
        if (updates.admin_notes !== undefined) dbUpdates.admin_notes = updates.admin_notes;

        dbUpdates.updated_at = new Date().toISOString();

        const { data: updated, error } = await supabase
            .from('registrations')
            .update(dbUpdates)
            .eq('registration_id', id)
            .select();

        if (error) throw error;
        if (!updated || updated.length === 0) return null;
        console.log('[DB] Registration updated in Supabase:', id);
        return mapFromDb(updated[0]);
    } catch (error) {
        console.error('[DB] Error updating registration in Supabase:', error);
        return null;
    }
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

import { NextResponse } from 'next/server';
import { addRegistration, getRegistrations } from '@/lib/db';
import { uploadToCloudinary } from '@/lib/cloudinary';
import path from 'path';
import { getCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeMessage(msg) {
    if (typeof msg !== 'string') return msg;
    let sanitized = msg;
    const tokens = [
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        process.env.SUPABASE_ANON_KEY,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        process.env.CLOUDINARY_API_SECRET,
        process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET
    ].map(t => t ? t.replace(/^["']|["']$/g, '').trim() : '');
    for (const token of tokens) {
        if (token && token.length > 3) {
            const escaped = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escaped, 'g');
            sanitized = sanitized.replace(regex, '[REDACTED]');
        }
    }
    return sanitized;
}

function safeErrorLog(prefix, err) {
    if (err instanceof Error) {
        let msg = sanitizeMessage(err.message || '');
        let stack = sanitizeMessage(err.stack || '');
        console.error(prefix, { message: msg, name: err.name, stack: stack });
    } else {
        console.error(prefix, sanitizeMessage(String(err)));
    }
}

export async function OPTIONS(request) {
    return handleOptions(request);
}

export async function POST(request) {
    const corsHeaders = getCorsHeaders(request);
    try {
        const formData = await request.formData();
        const type = formData.get('type') || 'registration';

        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');

        // Log "Registration received" / "Inquiry received"
        console.log(`${type === 'inquiry' ? 'Inquiry' : 'Registration'} received`);

        if (type === 'inquiry') {
            const message = formData.get('message');
            if (!name || !email || !phone || !message) {
                return NextResponse.json({ error: 'Missing required text fields for inquiry.' }, { status: 400, headers: corsHeaders });
            }

            const randomNum = Math.floor(100000 + Math.random() * 900000);
            const registrationId = `INQ-${randomNum}`;

            const inquiryData = {
                registrationId,
                id: registrationId,
                name,
                fullName: name,
                email,
                phone,
                whatsapp: formData.get('whatsapp') || phone,
                city: formData.get('city') || '',
                state: formData.get('state') || '',
                message,
                course: formData.get('course') || '',
                service: formData.get('service') || '',
                address: formData.get('address') || '',
                type: 'inquiry',
                paymentStatus: 'INQUIRY',
                paymentAmount: 0
            };

            const registration = await addRegistration(inquiryData);

            // Log "Registration processed successfully"
            console.log('Inquiry processed successfully');

            return NextResponse.json({
                success: true,
                registration,
                emailSent: false
            }, {
                status: 201,
                headers: corsHeaders
            });
        }

        // Original registration flow
        const instagramUsername = formData.get('instagramUsername');
        const dateOfBirth = formData.get('dateOfBirth');
        const whatsapp = formData.get('whatsapp');
        const height = formData.get('height');
        const state = formData.get('state');
        const city = formData.get('city');
        const pincode = formData.get('pincode');

        const fullLengthPhoto = formData.get('fullLengthPhoto');
        const closeUpPhoto = formData.get('closeUpPhoto');

        if (!name || !instagramUsername || !dateOfBirth || !email || !phone || !whatsapp || !height || !state || !city || !pincode) {
            return NextResponse.json({ success: false, error: 'Missing required text fields. Please complete all fields.' }, { status: 400, headers: corsHeaders });
        }

        const registrations = await getRegistrations();
        const duplicate = registrations.find(r =>
            (r.email?.toLowerCase() === email.toLowerCase() || r.phone === phone) &&
            r.paymentStatus === 'PAID'
        );
        if (duplicate) {
            return NextResponse.json({ success: false, error: 'This email address or phone number is already registered and database status is PAID.' }, { status: 400, headers: corsHeaders });
        }

        if (!fullLengthPhoto || !closeUpPhoto || typeof fullLengthPhoto === 'string' || typeof closeUpPhoto === 'string') {
            return NextResponse.json({ success: false, error: 'Both photos (Full Length and Close-up) are required.' }, { status: 400, headers: corsHeaders });
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

        const validatePhoto = (file, label) => {
            if (!allowedTypes.includes(file.type)) {
                const ext = path.extname(file.name).toLowerCase();
                if (!allowedExtensions.includes(ext)) {
                    throw new Error(`${label}: Invalid file type. Allowed formats: JPG, JPEG, PNG, WEBP.`);
                }
            }
            if (file.size > 5 * 1024 * 1024) {
                throw new Error(`${label}: File size exceeds 5 MB limit.`);
            }
        };

        try {
            validatePhoto(fullLengthPhoto, 'Full Length Photo');
            validatePhoto(closeUpPhoto, 'Close-Up Photo');
        } catch (validationErr) {
            return NextResponse.json({ success: false, error: validationErr.message }, { status: 400, headers: corsHeaders });
        }

        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const registrationId = `NINTM-${randomNum}`;

        const timestamp = Date.now();

        let fullLengthUrl = '';
        let closeUpUrl = '';
        try {
            // Upload Full Length Photo to Cloudinary
            const fullLengthBytes = await fullLengthPhoto.arrayBuffer();
            const fullLengthBuffer = Buffer.from(fullLengthBytes);
            const fullLengthExt = path.extname(fullLengthPhoto.name).toLowerCase() || '.jpg';
            const fullLengthFileName = `full-length-${timestamp}${fullLengthExt}`;

            const fullLengthResult = await uploadToCloudinary(
                fullLengthBuffer,
                `nintm/registrations/${registrationId}`,
                fullLengthFileName
            );
            fullLengthUrl = fullLengthResult.secure_url;

            // Upload Close-Up Photo to Cloudinary
            const closeUpBytes = await closeUpPhoto.arrayBuffer();
            const closeUpBuffer = Buffer.from(closeUpBytes);
            const closeUpExt = path.extname(closeUpPhoto.name).toLowerCase() || '.jpg';
            const closeUpFileName = `close-up-${timestamp}${closeUpExt}`;

            const closeUpResult = await uploadToCloudinary(
                closeUpBuffer,
                `nintm/registrations/${registrationId}`,
                closeUpFileName
            );
            closeUpUrl = closeUpResult.secure_url;
        } catch (uploadError) {
            safeErrorLog('[REGISTER] Cloudinary upload failed:', uploadError);
            return NextResponse.json({
                success: false,
                error: `Photo upload failed: ${sanitizeMessage(uploadError.message || 'Unknown upload or registration runtime error.')}`
            }, {
                status: 500,
                headers: corsHeaders
            });
        }

        const registrationData = {
            registrationId,
            id: registrationId,
            name,
            fullName: name,
            instagramUsername,
            dateOfBirth,
            dob: dateOfBirth,
            email,
            phone,
            whatsapp,
            height,
            state,
            city,
            pincode,
            fullLengthPhoto: fullLengthUrl,
            closeUpPhoto: closeUpUrl,
            paymentStatus: 'PENDING',
            paymentAmount: 0
        };

        const registration = await addRegistration(registrationData);

        // Log "Registration processed successfully"
        console.log('Registration processed successfully');

        return NextResponse.json({
            success: true,
            registration: {
                registrationId: registration.registrationId,
                name: registration.name,
                instagramUsername: registration.instagramUsername,
                dateOfBirth: registration.dateOfBirth,
                email: registration.email,
                phone: registration.phone,
                whatsapp: registration.whatsapp,
                height: registration.height,
                state: registration.state,
                city: registration.city,
                pincode: registration.pincode,
                fullLengthPhoto: registration.fullLengthPhoto,
                closeUpPhoto: registration.closeUpPhoto
            }
        }, {
            status: 201,
            headers: corsHeaders
        });

    } catch (error) {
        safeErrorLog('[REGISTER] Registration failed:', error);
        return NextResponse.json({
            success: false,
            error: `Registration failed: ${sanitizeMessage(error.message || 'Unknown registration runtime error.')}`
        }, {
            status: 500,
            headers: corsHeaders
        });
    }
}

import { NextResponse } from 'next/server';
import { resetAllPayments } from '@/lib/data';

export async function POST(req: Request) {
    try {
        await resetAllPayments();
        return NextResponse.json({ message: 'All order payments have been reset successfully.' });
    } catch (error: any) {
        console.error('Reset payments error:', error);
        return NextResponse.json({ message: 'Failed to reset payments.', error: error.message }, { status: 500 });
    }
}

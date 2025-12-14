import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loader({ className }) {
    return <Loader2 className={`animate-spin ${className}`} />;
}
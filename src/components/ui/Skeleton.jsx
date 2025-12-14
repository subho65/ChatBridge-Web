import React from 'react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function Skeleton({ className }) {
    return (
        <div className={cn("animate-pulse bg-[#202c33] rounded", className)} />
    );
}
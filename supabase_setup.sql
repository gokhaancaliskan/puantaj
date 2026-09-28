-- Run this SQL in your Supabase SQL Editor to create the work_records table and enable RLS

CREATE TABLE IF NOT EXISTS work_records (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    check_in_timestamp BIGINT,
    check_out_timestamp BIGINT,
    day_type TEXT CHECK (day_type IN ('weekday', 'saturday', 'sunday')) NOT NULL,
    is_leave_day BOOLEAN DEFAULT FALSE,
    source TEXT CHECK (source IN ('manual', 'widget', 'geofence')) NOT NULL,
    last_edited_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only view their own records
CREATE POLICY "Users can view their own work records" 
ON work_records FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy so users can insert their own records
CREATE POLICY "Users can insert their own work records" 
ON work_records FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy so users can update their own records
CREATE POLICY "Users can update their own work records" 
ON work_records FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy so users can delete their own records
CREATE POLICY "Users can delete their own work records" 
ON work_records FOR DELETE 
USING (auth.uid() = user_id);

-- Allow teachers and admins to view all learning_progress
CREATE POLICY "Teachers and admins can view all progress"
ON public.learning_progress
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')
);
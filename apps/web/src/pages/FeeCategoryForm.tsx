/**
 * Fee Category Form - Create and Edit Fee Categories
 */

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

interface FeeCategoryFormData {
  category_name: string;
  description: string;
}

export function FeeCategoryForm() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  const [formData, setFormData] = useState<FeeCategoryFormData>({
    category_name: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditMode && id) {
      loadCategory();
    }
  }, [id, isEditMode]);

  const loadCategory = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await apiService.getFeeCategories();
      const category = response.data.find((c: any) => c.id === id);
      if (category) {
        setFormData({
          category_name: category.category_name || '',
          description: category.description || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.category_name.trim()) {
      setError('Category name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && id) {
        await apiService.updateFeeCategory(id, formData);
        navigate('/fees/categories');
      } else {
        await apiService.createFeeCategory(formData);
        navigate('/fees/categories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof FeeCategoryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/fees/categories')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              {isEditMode ? 'Edit Fee Category' : 'Create Fee Category'}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {isEditMode ? 'Update category details' : 'Create a new fee category'}
            </p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {error && (
              <div style={{
                padding: '12px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                marginBottom: '24px',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Category Name */}
              <div>
                <label htmlFor="category_name" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Category Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="category_name"
                  type="text"
                  value={formData.category_name}
                  onChange={(e) => updateField('category_name', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., Tuition Fee, Library Fee"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Optional description"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Button type="submit" disabled={isSubmitting}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Update Category' : 'Create Category'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/fees/categories')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}






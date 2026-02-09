import React from 'react';
import { render } from '@testing-library/react-native';
import { GlassCard } from './GlassCard';
import { Text } from 'react-native';

describe('GlassCard', () => {
    it('renders children correctly', () => {
        const { getByText } = render(
            <GlassCard>
                <Text>Test Content</Text>
            </GlassCard>
        );

        expect(getByText('Test Content')).toBeTruthy();
    });

    it('renders without crashing with custom props', () => {
        const { getByText } = render(
            <GlassCard intensity={50} borderColor="red">
                <Text>Props Test</Text>
            </GlassCard>
        );
        expect(getByText('Props Test')).toBeTruthy();
    });
});

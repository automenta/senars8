import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import EnhancedInput from '@/components/EnhancedInput';

describe('EnhancedInput', () => {
    const mockOnChange = jest.fn();
    const mockOnSend = jest.fn();
    
    const defaultProps = {
        value: '',
        onChange: mockOnChange,
        onSend: mockOnSend,
        history: [],
        inputMode: 'narsese',
        setMode: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with default props', () => {
        render(<EnhancedInput {...defaultProps} />);
        
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /narsese/i })).toBeInTheDocument();
    });

    it('switches input mode when buttons are clicked', () => {
        const mockSetMode = jest.fn();
        render(<EnhancedInput {...defaultProps} setMode={mockSetMode} />);
        
        const naturalButton = screen.getByRole('button', { name: /natural/i });
        fireEvent.click(naturalButton);
        expect(mockSetMode).toHaveBeenCalledWith('natural');
        
        const narseseButton = screen.getByRole('button', { name: /narsese/i });
        fireEvent.click(narseseButton);
        expect(mockSetMode).toHaveBeenCalledWith('narsese');
    });

    it('calls onChange when input value changes', () => {
        render(<EnhancedInput {...defaultProps} />);
        
        const textbox = screen.getByRole('textbox');
        fireEvent.change(textbox, { target: { value: 'test input' } });
        
        expect(mockOnChange).toHaveBeenCalledWith('test input');
    });

    it('calls onSend when Enter is pressed', () => {
        render(<EnhancedInput {...defaultProps} />);
        
        const textbox = screen.getByRole('textbox');
        fireEvent.keyDown(textbox, { key: 'Enter', code: 'Enter' });
        
        expect(mockOnSend).toHaveBeenCalled();
    });

    it('supports history navigation with arrow keys', () => {
        // History array has most recent items first (index 0), older items later
        const history = ['recent item', 'older item'];
        render(<EnhancedInput {...defaultProps} history={history} />);
        
        const textbox = screen.getByRole('textbox');
        
        // Simulate pressing up arrow (this should get the most recent item)
        fireEvent.keyDown(textbox, { key: 'ArrowUp', code: 'ArrowUp' });
        // The first up arrow press gets the most recent item (at index 0)
        expect(mockOnChange).toHaveBeenCalledWith('recent item');
    });
});
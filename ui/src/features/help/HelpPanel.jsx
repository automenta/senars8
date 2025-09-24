import React, { useState } from 'react';
import { Panel } from '@/components';
import {HelpCircle, Book, Code, Zap, Network, Brain} from 'lucide-react';
import './HelpPanel.css';

const HelpPanel = () => {
    const [activeSection, setActiveSection] = useState('overview');

    const sections = [
        { id: 'overview', title: 'Overview', icon: <HelpCircle size={16} /> },
        { id: 'narsese', title: 'Narsese Guide', icon: <Code size={16} /> },
        { id: 'panels', title: 'Panels Guide', icon: <Book size={16} /> },
        { id: 'reasoning', title: 'Reasoning', icon: <Zap size={16} /> },
        { id: 'knowledge', title: 'Knowledge Graph', icon: <Network size={16} /> },
        { id: 'memory', title: 'Memory System', icon: <Brain size={16} /> }
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return (
                    <div className="help-content">
                        <h3>SeNARS IDE Overview</h3>
                        <p>The SeNARS Integrated Development Environment is a comprehensive tool for working with the NARS cognitive architecture.</p>
                        
                        <h4>Key Features:</h4>
                        <ul>
                            <li>Real-time interaction with the NARS reasoning engine</li>
                            <li>Visual representation of knowledge and reasoning processes</li>
                            <li>Multi-panel interface for monitoring system state</li>
                            <li>File system integration for persistent knowledge</li>
                            <li>Terminal access for command-line interaction</li>
                        </ul>
                        
                        <h4>Getting Started:</h4>
                        <ol>
                            <li>Make sure the SeNARS backend server is running</li>
                            <li>Check the connection status in the Status Panel</li>
                            <li>Use the Input Panel to enter Narsese statements</li>
                            <li>Monitor reasoning in the Reasoner Trace Panel</li>
                            <li>Visualize knowledge in the Knowledge Graph Panel</li>
                        </ol>
                    </div>
                );
                
            case 'narsese':
                return (
                    <div className="help-content">
                        <h3>Narsese Language Guide</h3>
                        
                        <h4>Basic Statements:</h4>
                        <p>Narsese is the formal language of NARS. Basic statements have the form:</p>
                        <code>&lt;subject --&gt; predicate&gt;.</code>
                        <p>For example:</p>
                        <ul>
                            <li><code>&lt;bird --&gt; animal&gt;.</code> (Birds are animals)</li>
                            <li><code>&lt;robin --&gt; bird&gt;.</code> (Robins are birds)</li>
                            <li><code>&lt;robin --&gt; animal&gt;.</code> (Robins are animals - derived)</li>
                        </ul>
                        
                        <h4>Questions:</h4>
                        <p>Ask questions by ending with '?':</p>
                        <ul>
                            <li><code>&lt;robin --&gt; animal&gt;?</code> (Are robins animals?)</li>
                            <li><code>(&amp;&amp;, &lt;robin --&gt; bird&gt;, &lt;robin --&gt; animal&gt;)?</code> (Are both true?)</li>
                        </ul>
                        
                        <h4>Connectors:</h4>
                        <ul>
                            <li><code>(&amp;&amp; ...)</code> - Conjunction (AND)</li>
                            <li><code>(|| ...)</code> - Disjunction (OR)</li>
                            <li><code>(&lt;- ...)</code> - Implication (IF...THEN)</li>
                            <li><code>(&lt;-&gt; ...)</code> - Equivalence (IF AND ONLY IF)</li>
                        </ul>
                    </div>
                );
                
            case 'panels':
                return (
                    <div className="help-content">
                        <h3>Panels Guide</h3>
                        
                        <h4>File Explorer</h4>
                        <p>Browse and manage files in the project directory. Supports all common file operations.</p>
                        
                        <h4>Code Editor</h4>
                        <p>Full-featured editor with syntax highlighting for Narsese and other languages. Supports multiple file formats.</p>
                        
                        <h4>Input Panel</h4>
                        <p>Enter Narsese statements or questions to interact with the reasoning engine.</p>
                        
                        <h4>Memory View</h4>
                        <p>Monitor the system's beliefs, goals, and other memory elements in real-time.</p>
                        
                        <h4>Knowledge Graph</h4>
                        <p>Visual representation of the knowledge network and relationships between concepts.</p>
                        
                        <h4>Reasoner Trace</h4>
                        <p>Track the reasoning steps and inference processes as they occur.</p>
                        
                        <h4>Terminal</h4>
                        <p>Command-line interface for advanced operations and system commands.</p>
                        
                        <h4>Internal State</h4>
                        <p>Monitor system metrics like cycle count, memory usage, temperature, etc.</p>
                    </div>
                );
                
            case 'reasoning':
                return (
                    <div className="help-content">
                        <h3>Reasoning in NARS</h3>
                        
                        <h4>Introduction</h4>
                        <p>NARS performs non-axiomatic reasoning, meaning it can process uncertain and incomplete information without requiring a complete and consistent knowledge base.</p>
                        
                        <h4>Reasoning Types</h4>
                        <ul>
                            <li><strong>Deductive:</strong> From general knowledge to specific conclusions</li>
                            <li><strong>Inductive:</strong> From specific instances to general knowledge</li>
                            <li><strong>Abductive:</strong> Finding the best explanation for observations</li>
                            <li><strong>Temporal:</strong> Reasoning about events in time</li>
                            <li><strong>Conditional:</strong> If-then reasoning</li>
                        </ul>
                        
                        <h4>Confidence and Priority</h4>
                        <p>Each belief in NARS has a truth-value with frequency and confidence components. The system prioritizes higher-confidence beliefs.</p>
                    </div>
                );
                
            case 'knowledge':
                return (
                    <div className="help-content">
                        <h3>Knowledge Graph in NARS</h3>
                        
                        <h4>Concept Nodes</h4>
                        <p>Each concept in the system is represented as a node in the knowledge graph. Concepts can be anything: objects, predicates, relations, or complex terms.</p>
                        
                        <h4>Relationships</h4>
                        <p>Directed edges represent relationships between concepts:</p>
                        <ul>
                            <li>Instance relationship: &lt;A --&gt; B&gt; (A is an instance of B)</li>
                            <li>Property relationship: &lt;A --&gt; B&gt; (A has property B)</li>
                            <li>Implication: &lt;A =?&gt; B&gt; (If A then B)</li>
                            <li>Equivalence: &lt;A &lt;?&gt; B&gt; (A if and only if B)</li>
                        </ul>
                        
                        <h4>Dynamic Graph</h4>
                        <p>The knowledge graph evolves as the system processes new information. New concepts and relationships are added, existing ones are refined, and some may be removed based on their usefulness.</p>
                    </div>
                );
                
            case 'memory':
                return (
                    <div className="help-content">
                        <h3>Memory System in NARS</h3>
                        
                        <h4>Working Memory</h4>
                        <p>Contains recently processed and highly active concepts, beliefs, and goals. This is where active reasoning occurs.</p>
                        
                        <h4>Long-term Memory</h4>
                        <p>Stores less active but persistent knowledge. Items move between working and long-term memory based on activation values.</p>
                        
                        <h4>Memory Control</h4>
                        <p>The system uses attention mechanisms to prioritize important information and forget irrelevant details. Concepts with higher activation values are more likely to participate in reasoning.</p>
                        
                        <h4>Concepts</h4>
                        <p>Each concept contains:</p>
                        <ul>
                            <li>Its term (name/identifier)</li>
                            <li>Associated beliefs about the concept</li>
                            <li>Associated goals related to the concept</li>
                            <li>Reference to other concepts</li>
                        </ul>
                    </div>
                );
                
            default:
                return <div className="help-content">Select a section from the menu.</div>;
        }
    };

    return (
        <Panel title={<><HelpCircle size={18}/> Help & Documentation</>} >
            <div className="help-panel">
                <div className="help-sidebar">
                    <ul>
                        {sections.map(section => (
                            <li 
                                key={section.id}
                                className={activeSection === section.id ? 'active' : ''}
                                onClick={() => setActiveSection(section.id)}
                            >
                                <span className="icon">{section.icon}</span>
                                <span className="title">{section.title}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="help-main">
                    {renderContent()}
                </div>
            </div>
        </Panel>
    );
};

export default HelpPanel;
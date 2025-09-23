import React, {useState} from 'react';
import Panel from '@/components/core/Panel';
import {HelpCircle, Book, ExternalLink, Code, Users} from 'lucide-react';
import './HelpPanel.css';

const helpSections = [
    {
        id: 'overview',
        title: 'Overview',
        icon: <HelpCircle size={18} />,
        content: (
            <div>
                <h3>SeNARS IDE</h3>
                <p>
                    SeNARS IDE is an integrated development environment for Non-Axiomatic Reasoning System (NARS) agents. 
                    It provides a visual interface for interacting with NARS agents, monitoring their internal state, 
                    and analyzing their reasoning processes.
                </p>
                <h4>Key Features</h4>
                <ul>
                    <li>Real-time monitoring of agent beliefs and reasoning</li>
                    <li>Visual knowledge graph representation</li>
                    <li>Task management and planning visualization</li>
                    <li>Performance statistics and metrics</li>
                    <li>Configuration management</li>
                </ul>
            </div>
        )
    },
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: <Book size={18} />,
        content: (
            <div>
                <h3>Getting Started</h3>
                <h4>1. Starting the Agent</h4>
                <p>
                    Use the Control panel to start the NARS agent. Click the "Start" button to begin the agent's reasoning cycle.
                </p>
                
                <h4>2. Interacting with the Agent</h4>
                <p>
                    Use the Input panel to send Narsese statements to the agent. You can input judgments, goals, and questions.
                </p>
                <p>
                    Examples:
                    <ul>
                        <li><code>&lt;bird --&gt; animal&gt;.</code> (Judgment)</li>
                        <li><code>&lt;bird --&gt; fly&gt;!</code> (Goal)</li>
                        <li><code>&lt;bird --&gt; swim&gt;?</code> (Question)</li>
                    </ul>
                </p>
                
                <h4>3. Monitoring Activity</h4>
                <p>
                    Use the various panels to monitor the agent's activity:
                </p>
                <ul>
                    <li><strong>Memory View</strong>: See the agent's current beliefs</li>
                    <li><strong>Knowledge Graph</strong>: Visualize relationships between concepts</li>
                    <li><strong>Reasoner Trace</strong>: Follow the agent's reasoning steps</li>
                    <li><strong>Statistics</strong>: View performance metrics</li>
                </ul>
            </div>
        )
    },
    {
        id: 'narsese',
        title: 'Narsese Syntax',
        icon: <Code size={18} />,
        content: (
            <div>
                <h3>Narsese Syntax</h3>
                <p>
                    Narsese is the formal language used by NARS agents. Here are the basic syntax elements:
                </p>
                
                <h4>Statements</h4>
                <ul>
                    <li><code>&lt;subject --&gt; predicate&gt;.</code> - Judgment (believed to be true)</li>
                    <li><code>&lt;subject --&gt; predicate&gt;!</code> - Goal (desired to be true)</li>
                    <li><code>&lt;subject --&gt; predicate&gt;?</code> - Question (inquire about truth value)</li>
                </ul>
                
                <h4>Compound Terms</h4>
                <ul>
                    <li><code>&lt;(A &amp; B) --&gt; C&gt;.</code> - Conjunction</li>
                    <li><code>&lt;(A | B) --&gt; C&gt;.</code> - Disjunction</li>
                    <li><code>&lt;(A ~ B) --&gt; C&gt;.</code> - Negation</li>
                </ul>
                
                <h4>Examples</h4>
                <ul>
                    <li><code>&lt;robin --&gt; bird&gt;.</code> - Robin is a bird</li>
                    <li><code>&lt;bird --&gt; animal&gt;.</code> - Birds are animals</li>
                    <li><code>&lt;(bird &amp; swim) --&gt; happy&gt;!</code> - Birds that swim should be happy (goal)</li>
                </ul>
            </div>
        )
    },
    {
        id: 'panels',
        title: 'Panel Guide',
        icon: <Book size={18} />,
        content: (
            <div>
                <h3>Panel Guide</h3>
                
                <h4>Control Panel</h4>
                <p>Start, stop, and reset the agent.</p>
                
                <h4>Status Panel</h4>
                <p>View the current status of the agent.</p>
                
                <h4>Input Panel</h4>
                <p>Send Narsese statements to the agent.</p>
                
                <h4>Log Panel</h4>
                <p>View all events and messages from the agent.</p>
                
                <h4>Memory View</h4>
                <p>See all current beliefs held by the agent.</p>
                
                <h4>Knowledge Graph</h4>
                <p>Visualize relationships between concepts in the agent's memory.</p>
                
                <h4>Reasoner Trace</h4>
                <p>Follow the agent's step-by-step reasoning process.</p>
                
                <h4>Statistics</h4>
                <p>View performance metrics and statistics.</p>
                
                <h4>Tasks</h4>
                <p>Manage and monitor agent tasks and goals.</p>
                
                <h4>Settings</h4>
                <p>Configure agent parameters and export/import settings.</p>
            </div>
        )
    },
    {
        id: 'resources',
        title: 'Resources',
        icon: <ExternalLink size={18} />,
        content: (
            <div>
                <h3>Additional Resources</h3>
                
                <h4>Documentation</h4>
                <ul>
                    <li><a href="https://github.com/opennars/opennars" target="_blank" rel="noopener noreferrer">OpenNARS GitHub <ExternalLink size={14} /></a></li>
                    <li><a href="https://www.cs.umd.edu/~nars/" target="_blank" rel="noopener noreferrer">NARS Website <ExternalLink size={14} /></a></li>
                </ul>
                
                <h4>Research Papers</h4>
                <ul>
                    <li><a href="https://www.springer.com/gp/book/9783642578595" target="_blank" rel="noopener noreferrer">Non-Axiomatic Logic <ExternalLink size={14} /></a></li>
                    <li><a href="https://www.worldscientific.com/worldscibooks/10.1142/8666" target="_blank" rel="noopener noreferrer">The Working Cycle of NARS <ExternalLink size={14} /></a></li>
                </ul>
                
                <h4>Community</h4>
                <ul>
                    <li><a href="https://groups.google.com/forum/#!forum/open-nars" target="_blank" rel="noopener noreferrer">OpenNARS Google Group <ExternalLink size={14} /></a></li>
                </ul>
            </div>
        )
    }
];

function HelpPanel() {
    const [activeSection, setActiveSection] = useState('overview');

    const activeContent = helpSections.find(section => section.id === activeSection)?.content || helpSections[0].content;

    return (
        <Panel title={<><HelpCircle size={18}/> Help</>}>
            <div className="help-panel">
                <div className="help-sidebar">
                    <nav>
                        <ul>
                            {helpSections.map((section) => (
                                <li key={section.id}>
                                    <button
                                        className={activeSection === section.id ? 'active' : ''}
                                        onClick={() => setActiveSection(section.id)}
                                    >
                                        {section.icon}
                                        {section.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
                <div className="help-content">
                    {activeContent}
                </div>
            </div>
        </Panel>
    );
}

export default HelpPanel;
import { Link } from 'react-router-dom';

interface GameCardProps {
    title: string;
    description: string;
    image: string;
    path: string;
    isNew?: boolean;
    tags?: string[];
}

export default function GameCard({ title, description, image, path, isNew, tags }: GameCardProps) {
    return (
        <Link to={path} className="game-card">
            <div className="card-thumb">
                <img src={image} alt={title} />
                {isNew && <span className="badge-new">NEW</span>}
            </div>
            <div className="card-info">
                <h3>{title}</h3>
                <p>{description}</p>
                {tags && tags.length > 0 && (
                    <div className="card-tags">
                        {tags.map((tag, idx) => (
                            <span key={idx} className="card-tag">{tag}</span>
                        ))}
                    </div>
                )}
                <div className="play-btn">Play Now ►</div>
            </div>
        </Link>
    );
}

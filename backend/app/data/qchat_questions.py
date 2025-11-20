"""
Q-CHAT-10 question data module.

This module contains all 10 Q-CHAT questions with their various formats
(formal, conversational) in both English and Arabic, along with examples
and scoring metadata.

Questions can be easily modified here without requiring database migrations.
"""
from typing import Dict, Optional
from pathlib import Path


class QChatDatabase:
    """
    Manages Q-CHAT-10 questions and data.

    This class contains all Q-CHAT-10 questions in hard-coded format,
    making them easy to modify without database operations.
    """

    def __init__(self, data_dir: str = "./data"):
        """Initialize with optional data directory (for future file-based persistence)."""
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

        # Create subdirectories for potential future use
        (self.data_dir / "questions").mkdir(exist_ok=True)
        (self.data_dir / "sessions").mkdir(exist_ok=True)

        self.questions = self._create_default_questions()

    def _create_default_questions(self) -> Dict:
        """Create the complete Q-CHAT-10 question set."""
        return {
            "q_chat_questions": {
                "question_1": {
                    "id": 1,
                    "english": {
                        "formal": "Does your child look at you when you call his/her name?",
                        "conversational": "When you call [child_name]'s name, how often do they look at you or respond? Do they always look, usually, sometimes, rarely, or never?",
                        "options": [
                            {"value": "A", "label": "Always"},
                            {"value": "B", "label": "Usually"},
                            {"value": "C", "label": "Sometimes"},
                            {"value": "D", "label": "Rarely"},
                            {"value": "E", "label": "Never"}
                        ],
                        "examples": {
                            "A": ["[child_name] immediately looks up every single time you call their name"],
                            "B": ["[child_name] looks up most times when you call, maybe misses once in a while"],
                            "C": ["[child_name] only looks up about half the time or on and off"],
                            "D": ["[child_name] rarely responds to their name, maybe 1 out of 5 times"],
                            "E": ["[child_name] never looks up when you call their name"]
                        }
                    },
                    "arabic": {
                        "formal": "هل ينظر طفلك إليك عندما تنادي باسمه؟",
                        "conversational": "عندما تنادي [child_name] باسمه، كم مرة ينظر إليك أو يستجيب؟ هل ينظر دائماً، عادةً، أحياناً، نادراً، أم أبداً؟",
                        "options": [
                            {"value": "A", "label": "دائماً"},
                            {"value": "B", "label": "عادة"},
                            {"value": "C", "label": "أحياناً"},
                            {"value": "D", "label": "نادراً"},
                            {"value": "E", "label": "أبداً"}
                        ],
                        "examples": {
                            "A": ["[child_name] ينظر فوراً في كل مرة تنادي باسمه"],
                            "B": ["[child_name] ينظر في معظم الأوقات عند المناداة"],
                            "C": ["[child_name] ينظر فقط حوالي نصف الوقت"],
                            "D": ["[child_name] نادراً ما يستجيب لاسمه"],
                            "E": ["[child_name] لا ينظر أبداً عند مناداة اسمه"]
                        }
                    },
                    "video_positive": "/videos/Q1/positive.mp4",
                    "video_negative": "/videos/Q1/negative.mp4",
                    "scoring": {
                        "typical": ["A", "B"],
                        "atypical": ["C", "D", "E"]
                    }
                },
                "question_2": {
                    "id": 2,
                    "english": {
                        "formal": "How easy is it for you to get eye contact with your child?",
                        "conversational": "When you try to make eye contact with [child_name], how easy is it? Is it very easy, quite easy, quite difficult, very difficult, or impossible?",
                        "options": [
                            {"value": "A", "label": "Very easy"},
                            {"value": "B", "label": "Quite easy"},
                            {"value": "C", "label": "Quite difficult"},
                            {"value": "D", "label": "Very difficult"},
                            {"value": "E", "label": "Impossible"}
                        ],
                        "examples": {
                            "A": ["[child_name] makes eye contact naturally and easily all the time"],
                            "B": ["[child_name] makes eye contact fairly easily, no major issues"],
                            "C": ["[child_name] sometimes avoids eye contact, somewhat challenging"],
                            "D": ["[child_name] rarely makes eye contact, very challenging to get"],
                            "E": ["[child_name] never makes eye contact no matter what you try"]
                        }
                    },
                    "arabic": {
                        "formal": "ما مدى سهولة التواصل البصري مع طفلك؟",
                        "conversational": "عندما تحاول التواصل البصري مع [child_name]، كم هو سهل؟ هل هو سهل جداً، سهل نوعاً ما، صعب نوعاً ما، صعب جداً، أم مستحيل؟",
                        "options": [
                            {"value": "A", "label": "سهل جداً"},
                            {"value": "B", "label": "سهل نوعاً ما"},
                            {"value": "C", "label": "صعب نوعاً ما"},
                            {"value": "D", "label": "صعب جداً"},
                            {"value": "E", "label": "مستحيل"}
                        ],
                        "examples": {
                            "A": ["[child_name] يقوم بالتواصل البصري بشكل طبيعي وسهل طوال الوقت"],
                            "B": ["[child_name] يقوم بالتواصل البصري بسهولة إلى حد ما"],
                            "C": ["[child_name] أحياناً يتجنب التواصل البصري"],
                            "D": ["[child_name] نادراً ما يقوم بالتواصل البصري"],
                            "E": ["[child_name] لا يقوم بالتواصل البصري أبداً"]
                        }
                    },
                    "video_positive": "/videos/Q2/positive.mp4",
                    "video_negative": "/videos/Q2/negative.mp4",
                    "scoring": {
                        "typical": ["A", "B"],
                        "atypical": ["C", "D", "E"]
                    }
                },
                "question_3": {
                    "id": 3,
                    "english": {
                        "formal": "Does your child point to indicate that s/he wants something? (e.g. a toy that is out of reach)",
                        "conversational": "Does [child_name] point to things they want, like a toy that's out of reach? How often - many times a day, a few times a day, a few times a week, less than once a week, or never?",
                        "options": [
                            {"value": "A", "label": "Many times a day"},
                            {"value": "B", "label": "A few times a day"},
                            {"value": "C", "label": "A few times a week"},
                            {"value": "D", "label": "Less than once a week"},
                            {"value": "E", "label": "Never"}
                        ],
                        "examples": {
                            "A": ["[child_name] points to request things constantly throughout the day"],
                            "B": ["[child_name] points to request things several times each day"],
                            "C": ["[child_name] points occasionally during the week"],
                            "D": ["[child_name] very rarely points to request things"],
                            "E": ["[child_name] never points to indicate wants"]
                        }
                    },
                    "arabic": {
                        "formal": "هل يشير طفلك للإشارة إلى أنه يريد شيئاً؟ (مثل لعبة بعيدة عن متناول اليد)",
                        "conversational": "هل يشير [child_name] إلى الأشياء التي يريدها؟ كم مرة - عدة مرات في اليوم، بضع مرات في اليوم، بضع مرات في الأسبوع، أقل من مرة في الأسبوع، أم أبداً؟",
                        "options": [
                            {"value": "A", "label": "عدة مرات في اليوم"},
                            {"value": "B", "label": "بضع مرات في اليوم"},
                            {"value": "C", "label": "بضع مرات في الأسبوع"},
                            {"value": "D", "label": "أقل من مرة في الأسبوع"},
                            {"value": "E", "label": "أبداً"}
                        ],
                        "examples": {
                            "A": ["[child_name] يشير لطلب الأشياء باستمرار طوال اليوم"],
                            "B": ["[child_name] يشير لطلب الأشياء عدة مرات كل يوم"],
                            "C": ["[child_name] يشير أحياناً خلال الأسبوع"],
                            "D": ["[child_name] نادراً جداً ما يشير لطلب الأشياء"],
                            "E": ["[child_name] لا يشير أبداً للإشارة إلى رغباته"]
                        }
                    },
                    "video_positive": "/videos/Q3/positive.mp4",
                    "video_negative": "/videos/Q3/negative.mp4",
                    "scoring": {
                        "typical": ["A", "B"],
                        "atypical": ["C", "D", "E"]
                    }
                },
                "question_4": {
                    "id": 4,
                    "english": {
                        "formal": "Does your child point to share interest with you? (e.g. pointing at an interesting sight)",
                        "conversational": "Does [child_name] point to show you interesting things, like pointing at an airplane or a dog? How often - many times a day, a few times a day, a few times a week, less than once a week, or never?",
                        "options": [
                            {"value": "A", "label": "Many times a day"},
                            {"value": "B", "label": "A few times a day"},
                            {"value": "C", "label": "A few times a week"},
                            {"value": "D", "label": "Less than once a week"},
                            {"value": "E", "label": "Never"}
                        ],
                        "examples": {
                            "A": ["[child_name] frequently points to share sights throughout the day"],
                            "B": ["[child_name] points to share interesting things a few times daily"],
                            "C": ["[child_name] occasionally points to share during the week"],
                            "D": ["[child_name] very rarely points to share interest"],
                            "E": ["[child_name] never points to share interest with you"]
                        }
                    },
                    "arabic": {
                        "formal": "هل يشير طفلك لمشاركة الاهتمام معك؟ (مثل الإشارة إلى شيء مثير للاهتمام)",
                        "conversational": "هل يشير [child_name] لإظهار أشياء مثيرة للاهتمام، مثل الإشارة إلى طائرة أو كلب؟ كم مرة؟",
                        "options": [
                            {"value": "A", "label": "عدة مرات في اليوم"},
                            {"value": "B", "label": "بضع مرات في اليوم"},
                            {"value": "C", "label": "بضع مرات في الأسبوع"},
                            {"value": "D", "label": "أقل من مرة في الأسبوع"},
                            {"value": "E", "label": "أبداً"}
                        ],
                        "examples": {
                            "A": ["[child_name] يشير بشكل متكرر لمشاركة المشاهد طوال اليوم"],
                            "B": ["[child_name] يشير لمشاركة الأشياء المثيرة بضع مرات يومياً"],
                            "C": ["[child_name] يشير أحياناً للمشاركة خلال الأسبوع"],
                            "D": ["[child_name] نادراً جداً ما يشير لمشاركة الاهتمام"],
                            "E": ["[child_name] لا يشير أبداً لمشاركة الاهتمام معك"]
                        }
                    },
                    "video_positive": "/videos/Q4/positive.mp4",
                    "video_negative": "/videos/Q4/negative.mp4",
                    "scoring": {
                        "typical": ["A", "B"],
                        "atypical": ["C", "D", "E"]
                    }
                },
                "question_5": {
                    "id": 5,
                    "english": {
                        "formal": "Does your child pretend? (e.g. care for dolls, talk on a toy phone)",
                        "conversational": "Does [child_name] pretend play, like caring for dolls or talking on a toy phone? How often?",
                        "options": [
                            {"value": "A", "label": "Many times a day"},
                            {"value": "B", "label": "A few times a day"},
                            {"value": "C", "label": "A few times a week"},
                            {"value": "D", "label": "Less than once a week"},
                            {"value": "E", "label": "Never"}
                        ],
                        "examples": {
                            "A": ["[child_name] engages in pretend play constantly throughout the day"],
                            "B": ["[child_name] pretends several times each day"],
                            "C": ["[child_name] pretends occasionally during the week"],
                            "D": ["[child_name] very rarely engages in pretend play"],
                            "E": ["[child_name] never pretends or engages in imaginative play"]
                        }
                    },
                    "arabic": {
                        "formal": "هل يتظاهر طفلك؟ (مثل الاعتناء بالدمى، التحدث على هاتف لعبة)",
                        "conversational": "هل يلعب [child_name] ألعاب تخيلية؟ كم مرة؟",
                        "options": [
                            {"value": "A", "label": "عدة مرات في اليوم"},
                            {"value": "B", "label": "بضع مرات في اليوم"},
                            {"value": "C", "label": "بضع مرات في الأسبوع"},
                            {"value": "D", "label": "أقل من مرة في الأسبوع"},
                            {"value": "E", "label": "أبداً"}
                        ],
                        "examples": {
                            "A": ["[child_name] يشارك في اللعب التخيلي باستمرار طوال اليوم"],
                            "B": ["[child_name] يتظاهر عدة مرات كل يوم"],
                            "C": ["[child_name] يتظاهر أحياناً خلال الأسبوع"],
                            "D": ["[child_name] نادراً جداً ما يشارك في اللعب التخيلي"],
                            "E": ["[child_name] لا يتظاهر أبداً أو يشارك في اللعب التخيلي"]
                        }
                    },
                    "video_positive": "/videos/Q5/positive.mp4",
                    "video_negative": "/videos/Q5/negative.mp4",
                    "scoring": {
                        "typical": ["A", "B"],
                        "atypical": ["C", "D", "E"]
                    }
                },
                "question_6": {
                    "id": 6,
                    "english": {
                        "formal": "Does your child follow where you're looking?",
                        "conversational": "When you look at something, does [child_name] follow your gaze to see what you're looking at? How often?",
                        "options": [
                            {"value": "A", "label": "Many times a day"},
                            {"value": "B", "label": "A few times a day"},
                            {"value": "C", "label": "A few times a week"},
                            {"value": "D", "label": "Less than once a week"},
                            {"value": "E", "label": "Never"}
                        ],
                        "examples": {
                            "A": ["[child_name] consistently follows your gaze throughout the day"],
                            "B": ["[child_name] follows your gaze several times daily"],
                            "C": ["[child_name] occasionally follows your gaze during the week"],
                            "D": ["[child_name] very rarely follows where you're looking"],
                            "E": ["[child_name] never follows your gaze"]
                        }
                    },
                    "arabic": {
                        "formal": "هل يتبع طفلك نظرك؟",
                        "conversational": "عندما تنظر إلى شيء ما، هل يتبع [child_name] نظرتك؟ كم مرة؟",
                        "options": [
                            {"value": "A", "label": "عدة مرات في اليوم"},
                            {"value": "B", "label": "بضع مرات في اليوم"},
                            {"value": "C", "label": "بضع مرات في الأسبوع"},
                            {"value": "D", "label": "أقل من مرة في الأسبوع"},
                            {"value": "E", "label": "أبداً"}
                        ],
                        "examples": {
                            "A": ["[child_name] يتبع نظرتك باستمرار طوال اليوم"],
                            "B": ["[child_name] يتبع نظرتك عدة مرات يومياً"],
                            "C": ["[child_name] يتبع نظرتك أحياناً خلال الأسبوع"],
                            "D": ["[child_name] نادراً جداً ما يتبع نظرتك"],
                            "E": ["[child_name] لا يتبع نظرتك أبداً"]
                        }
                    },
                    "video_positive": "/videos/Q6/positive.mp4",
                    "video_negative": "/videos/Q6/negative.mp4",
                    "scoring": {
                        "typical": ["A", "B"],
                        "atypical": ["C", "D", "E"]
                    }
                },
                "question_7": {
                    "id": 7,
                    "english": {
                        "formal": "If you or someone else in the family is visibly upset, does your child show signs of wanting to comfort them? (e.g. stroking hair, hugging them)",
                        "conversational": "When you or someone in the family is upset, does [child_name] try to comfort them by stroking hair or hugging? How often?",
                        "options": [
                            {"value": "A", "label": "Always"},
                            {"value": "B", "label": "Usually"},
                            {"value": "C", "label": "Sometimes"},
                            {"value": "D", "label": "Rarely"},
                            {"value": "E", "label": "Never"}
                        ],
                        "examples": {
                            "A": ["[child_name] always shows comfort when someone is upset"],
                            "B": ["[child_name] usually tries to comfort upset people"],
                            "C": ["[child_name] sometimes shows comfort behaviors"],
                            "D": ["[child_name] rarely shows comfort behaviors"],
                            "E": ["[child_name] never shows signs of wanting to comfort others"]
                        }
                    },
                    "arabic": {
                        "formal": "إذا كنت أنت أو أي شخص آخر في العائلة منزعجاً بشكل واضح، هل يظهر طفلك علامات الرغبة في مواساته؟",
                        "conversational": "عندما تكون أنت أو شخص في العائلة منزعجاً، هل يحاول [child_name] مواساته؟ كم مرة؟",
                        "options": [
                            {"value": "A", "label": "دائماً"},
                            {"value": "B", "label": "عادة"},
                            {"value": "C", "label": "أحياناً"},
                            {"value": "D", "label": "نادراً"},
                            {"value": "E", "label": "أبداً"}
                        ],
                        "examples": {
                            "A": ["[child_name] يظهر دائماً المواساة عندما يكون شخص ما منزعجاً"],
                            "B": ["[child_name] عادة يحاول مواساة الأشخاص المنزعجين"],
                            "C": ["[child_name] أحياناً يظهر سلوكيات المواساة"],
                            "D": ["[child_name] نادراً ما يظهر سلوكيات المواساة"],
                            "E": ["[child_name] لا يظهر أبداً علامات الرغبة في مواساة الآخرين"]
                        }
                    },
                    "video_positive": "/videos/Q7/positive.mp4",
                    "video_negative": "/videos/Q7/negative.mp4",
                    "scoring": {
                        "typical": ["A", "B"],
                        "atypical": ["C", "D", "E"]
                    }
                },
                "question_8": {
                    "id": 8,
                    "english": {
                        "formal": "Would you describe your child's first words as:",
                        "conversational": "How would you describe [child_name]'s first words? Very typical, quite typical, slightly unusual, very unusual, or your child doesn't speak yet?",
                        "options": [
                            {"value": "A", "label": "Very typical"},
                            {"value": "B", "label": "Quite typical"},
                            {"value": "C", "label": "Slightly unusual"},
                            {"value": "D", "label": "Very unusual"},
                            {"value": "E", "label": "My child doesn't speak"}
                        ],
                        "examples": {
                            "A": ["[child_name]'s first words were very typical like 'mama', 'dada', 'ball'"],
                            "B": ["[child_name]'s words were mostly typical with nothing unusual"],
                            "C": ["[child_name]'s words were a bit unusual or uncommon"],
                            "D": ["[child_name]'s words were very unusual or strange"],
                            "E": ["[child_name] doesn't speak yet or hasn't said first words"]
                        }
                    },
                    "arabic": {
                        "formal": "كيف تصف كلمات طفلك الأولى:",
                        "conversational": "كيف تصف كلمات [child_name] الأولى؟ نموذجية جداً، نموذجية نوعاً ما، غير عادية قليلاً، غير عادية جداً، أم طفلك لا يتكلم؟",
                        "options": [
                            {"value": "A", "label": "نموذجية جداً"},
                            {"value": "B", "label": "نموذجية نوعاً ما"},
                            {"value": "C", "label": "غير عادية قليلاً"},
                            {"value": "D", "label": "غير عادية جداً"},
                            {"value": "E", "label": "طفلي لا يتكلم"}
                        ],
                        "examples": {
                            "A": ["كلمات [child_name] الأولى كانت نموذجية جداً مثل 'ماما'، 'بابا'"],
                            "B": ["كلمات [child_name] كانت نموذجية في الغالب"],
                            "C": ["كلمات [child_name] كانت غير عادية قليلاً"],
                            "D": ["كلمات [child_name] كانت غير عادية جداً"],
                            "E": ["[child_name] لا يتكلم بعد"]
                        }
                    },
                    "video_positive": "/videos/Q8/positive.mp4",
                    "video_negative": "/videos/Q8/negative.mp4",
                    "scoring": {
                        "typical": ["A", "B"],
                        "atypical": ["C", "D", "E"]
                    }
                },
                "question_9": {
                    "id": 9,
                    "english": {
                        "formal": "Does your child use simple gestures? (e.g. wave goodbye)",
                        "conversational": "Does [child_name] use simple gestures like waving goodbye? How often?",
                        "options": [
                            {"value": "A", "label": "Many times a day"},
                            {"value": "B", "label": "A few times a day"},
                            {"value": "C", "label": "A few times a week"},
                            {"value": "D", "label": "Less than once a week"},
                            {"value": "E", "label": "Never"}
                        ],
                        "examples": {
                            "A": ["[child_name] uses gestures like waving frequently throughout the day"],
                            "B": ["[child_name] uses gestures several times each day"],
                            "C": ["[child_name] uses gestures occasionally during the week"],
                            "D": ["[child_name] very rarely uses gestures"],
                            "E": ["[child_name] never uses simple gestures like waving"]
                        }
                    },
                    "arabic": {
                        "formal": "هل يستخدم طفلك إيماءات بسيطة؟ (مثل التلويح بالوداع)",
                        "conversational": "هل يستخدم [child_name] إيماءات بسيطة مثل التلويح بالوداع؟ كم مرة؟",
                        "options": [
                            {"value": "A", "label": "عدة مرات في اليوم"},
                            {"value": "B", "label": "بضع مرات في اليوم"},
                            {"value": "C", "label": "بضع مرات في الأسبوع"},
                            {"value": "D", "label": "أقل من مرة في الأسبوع"},
                            {"value": "E", "label": "أبداً"}
                        ],
                        "examples": {
                            "A": ["[child_name] يستخدم الإيماءات مثل التلويح بشكل متكرر طوال اليوم"],
                            "B": ["[child_name] يستخدم الإيماءات عدة مرات كل يوم"],
                            "C": ["[child_name] يستخدم الإيماءات أحياناً خلال الأسبوع"],
                            "D": ["[child_name] نادراً جداً ما يستخدم الإيماءات"],
                            "E": ["[child_name] لا يستخدم أبداً الإيماءات البسيطة مثل التلويح"]
                        }
                    },
                    "video_positive": "/videos/Q9/positive.mp4",
                    "video_negative": "/videos/Q9/negative.mp4",
                    "scoring": {
                        "typical": ["A", "B"],
                        "atypical": ["C", "D", "E"]
                    }
                },
                "question_10": {
                    "id": 10,
                    "english": {
                        "formal": "Does your child stare at nothing with no apparent purpose?",
                        "conversational": "Does [child_name] stare at nothing with no clear reason? How often?",
                        "options": [
                            {"value": "A", "label": "Many times a day"},
                            {"value": "B", "label": "A few times a day"},
                            {"value": "C", "label": "A few times a week"},
                            {"value": "D", "label": "Less than once a week"},
                            {"value": "E", "label": "Never"}
                        ],
                        "examples": {
                            "A": ["[child_name] frequently stares at nothing throughout the day"],
                            "B": ["[child_name] stares at nothing a few times each day"],
                            "C": ["[child_name] occasionally stares at nothing during the week"],
                            "D": ["[child_name] very rarely stares at nothing"],
                            "E": ["[child_name] never stares at nothing with no purpose"]
                        }
                    },
                    "arabic": {
                        "formal": "هل يحدق طفلك في لا شيء دون هدف واضح؟",
                        "conversational": "هل يحدق [child_name] في لا شيء دون سبب واضح؟ كم مرة؟",
                        "options": [
                            {"value": "A", "label": "عدة مرات في اليوم"},
                            {"value": "B", "label": "بضع مرات في اليوم"},
                            {"value": "C", "label": "بضع مرات في الأسبوع"},
                            {"value": "D", "label": "أقل من مرة في الأسبوع"},
                            {"value": "E", "label": "أبداً"}
                        ],
                        "examples": {
                            "A": ["[child_name] يحدق في لا شيء بشكل متكرر طوال اليوم"],
                            "B": ["[child_name] يحدق في لا شيء بضع مرات كل يوم"],
                            "C": ["[child_name] يحدق في لا شيء أحياناً خلال الأسبوع"],
                            "D": ["[child_name] نادراً جداً ما يحدق في لا شيء"],
                            "E": ["[child_name] لا يحدق أبداً في لا شيء دون هدف"]
                        }
                    },
                    "video_positive": "/videos/Q10/positive.mp4",
                    "video_negative": "/videos/Q10/negative.mp4",
                    "scoring": {
                        "typical": ["D", "E"],  # REVERSED SCORING
                        "atypical": ["A", "B", "C"]
                    }
                }
            }
        }

    def get_question(self, question_id: int, language: str = "english") -> Optional[Dict]:
        """Get specific question by ID and language."""
        question_key = f"question_{question_id}"
        if question_key in self.questions["q_chat_questions"]:
            return self.questions["q_chat_questions"][question_key].get(language)
        return None

    def get_question_full(self, question_id: int) -> Optional[Dict]:
        """Get complete question data (all languages + metadata)."""
        question_key = f"question_{question_id}"
        return self.questions["q_chat_questions"].get(question_key)

    def get_total_questions(self) -> int:
        """Get total number of questions (always 10 for Q-CHAT)."""
        return len(self.questions["q_chat_questions"])

    def get_all_questions(self, language: str = "english") -> list:
        """Get all questions in specified language."""
        questions_list = []
        for i in range(1, 11):
            q_data = self.get_question(i, language)
            if q_data:
                questions_list.append({
                    "question_number": i,
                    **q_data
                })
        return questions_list


# Create a global instance for easy access
_db = QChatDatabase()


def get_question(question_number: int) -> dict | None:
    """
    Get a question by number in the format expected by the API.
    
    Returns a dict with:
    - question_number: int
    - text_en: str
    - text_ar: str
    - options: list[dict] with value, label_en, label_ar
    - video_positive: str
    - video_negative: str
    """
    question_full = _db.get_question_full(question_number)
    if not question_full:
        return None
    
    # Get English and Arabic data
    en_data = question_full.get("english", {})
    ar_data = question_full.get("arabic", {})
    
    # Build options with both languages
    options = []
    en_options = en_data.get("options", [])
    ar_options = ar_data.get("options", [])
    
    # Match options by value
    for en_opt in en_options:
        value = en_opt["value"]
        ar_opt = next((opt for opt in ar_options if opt["value"] == value), None)
        options.append({
            "value": value,
            "label_en": en_opt["label"],
            "label_ar": ar_opt["label"] if ar_opt else en_opt["label"]
        })
    
    return {
        "question_number": question_number,
        "text_en": en_data.get("formal", ""),
        "text_ar": ar_data.get("formal", ""),
        "options": options,
        "video_positive": question_full.get("video_positive", ""),
        "video_negative": question_full.get("video_negative", ""),
    }


def get_all_questions() -> list[dict]:
    """Get all questions in the format expected by the API."""
    questions = []
    for i in range(1, 11):
        q = get_question(i)
        if q:
            questions.append(q)
    return questions


# Export QCHAT_QUESTIONS as a list for backward compatibility
QCHAT_QUESTIONS = get_all_questions()

'use strict'

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const { BlogPost } = require('../models');
const { app, runServer, closeServer } = require('../server.js');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedBlogPost() {
    console.info("Seeding blog post data into test database");
    const seedData = [];

    for (i = 1; i <= 10; i += 1) {
        seedData.push(generateBlogPost());
    }

    return BlogPost.insertMany(seedData);
}

function generateTitle() {
    const titles = ["Sweet Post", "Great Post", "Tubular Post", "Okay Post", "Another Great Post"];
    return titles[Math.floor(Math.random() * titles.length)];
}

function generateBlogPost() {
    return {
        title: generateTitle(),
        author: faker.name.firstName(),
        content: faker.lorem.sentence(),
    }
}

// Tears down the test database - put this at the end of the tests
function tearDownDB() {
    console.warn("Deleting database");
    return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {
    before(function() {
        return seedBlogPost(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return runServer();
    });

    afterEach(function() {
        return closeServer();
    });

    after(function() {
        return tearDownDB();
    });

    // using nested 'describe' blocks allows us to make clearer,
    // more focused tests that prove something small
    describe('GET endpoint', function() {
        it('should return all blog posts', function() {
            // we declare 'res' so that the rest of the '.then' statements
            // can access and mutate the response
            let res;
            return chai.request(app)
                .get('/blogposts')
                .then(function(_res) {
                    // so subsequent '.then' blocks can access the response object
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res.body.blogposts).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    expect(res.body.count).to.have.lengthOf(count);
                });
        });

        it('should return blog posts with proper fields', function() {
            let resBlogPost;
            return chai.request(app)
                .get('/blogposts')
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.blogposts).to.be.a('array');
                    expect(res.body.blogposts).to.have.lengthOf.at.least(1);

                    res.body.blogposts.forEach(function(post) {
                        expect(post).to.be.an('object');
                        expect(post).to.include.keys("title", "author", "content");
                    });
                    resBlogPost = res.body.blogposts[0];
                    return BlogPost.findById(resBlogPost.id);
                })
                .then(function(blogpost) {
                    expect(resBlogPost.id).to.equal(blogpost.id);
                    expect(resBlogPost.title).to.equal(blogpost.title);
                    expect(resBlogPost.author).to.equal(blogpost.author);
                    expect(resBlogPost.content).to.equal(blogpost.content);
                });
        });

    });

    describe('POST endpoint', function() {
        it('should make and post a new blog post', function() {
            const newPost = generateBlogPost();

            return chai.request(app)
                .post('/blogposts')
                .send(newPost)
                .then(function(res) {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('object');
                    expect(res.body).to.include.keys("title", "author", "content");
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.title).to.equal(newPost.title);
                    expect(res.body.author).to.equal(newPost.author);
                    expect(res.body.content).to.equal(newPost.content);

                    return BlogPost.findById(res.body.id);
                })
                .then(function(post) {
                    expect(post.id).to.equal(newPost.id);
                    expect(post.title).to.equal(newPost.title);
                    expect(post.author).to.equal(newPost.author);
                    expect(post.content).to.equal(newPost.content);
                });
        });
    });

    describe('PUT endpoint', function() {
        it('should update an existing blog post', function() {
            const postUpdates = {
                title: "Sweet New Title, Yo",
                content: "I couldn\'t think of anything, dangit"
            };

            return BlogPost
                .findOne()
                .then(function(post) {
                    postUpdates.id = post.id;

                    return chai.request(app)
                        .put(`/blogposts/${post.id}`)
                        .send(postUpdates);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(postUpdates.id);
                })
                .then(function(post) {
                    expect(post.title).to.equal(postUpdates.title);
                    expect(post.content).to.equal(postUpdates.content);
                });
        });
    });

    describe('DELETE endpoint', function() {
        it('should delete an existing blog post by id', function() {
            const post;

            return BlogPost
                .findOne()
                .then(function(_post) {
                    post = _post;
                    return chai.request(app).delete(`/blogposts/${post.id}`);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(function(_post) {
                    expect(_post).to.be.null;
                })
        });
    });



})